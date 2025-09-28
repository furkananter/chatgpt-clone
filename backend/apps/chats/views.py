from typing import List

from asgiref.sync import sync_to_async
from django.conf import settings
from django.db.models import Prefetch
from ninja import Router
from ninja.errors import HttpError
from ninja.pagination import PageNumberPagination, paginate

from apps.authentication.views import auth_bearer_instance
from shared.rate_limiting import apply_rate_limit
from shared.exceptions import RateLimitExceededError

from .models import Chat, Message
from .schemas import (
    ChatCreateRequest,
    ChatListResponse,
    ChatResponse,
    MessageCreateRequest,
    MessageEditRequest,
    MessageRegenerateRequest,
    MessageResponse,
    MessageAttachmentSchema,
)
from .pipeline import chat_pipeline
from .services import MessageService

chat_router = Router(tags=["Chats"])

# Streaming endpoint moved here due to Django Ninja routing issues
import json
import logging
import time
from django.http import StreamingHttpResponse

logger = logging.getLogger(__name__)


async def serialize_message(message: Message) -> MessageResponse:
    attachments_cache = getattr(message, "_prefetched_objects_cache", {})

    if (
        attachments_cache
        and isinstance(attachments_cache, dict)
        and "attachments" in attachments_cache
    ):
        attachments = list(attachments_cache.get("attachments", []))
    else:
        attachments = await sync_to_async(
            lambda: list(message.attachments.all()),
            thread_sensitive=True,
        )()

    attachment_payload = (
        [MessageAttachmentSchema.from_orm(item) for item in attachments]
        if attachments
        else None
    )

    return MessageResponse(
        id=str(message.id),
        role=message.role,
        content=message.content,
        raw_content=message.raw_content,
        model_used=message.model_used,
        prompt_tokens=message.prompt_tokens,
        completion_tokens=message.completion_tokens,
        total_tokens=message.total_tokens,
        status=message.status,
        error_message=message.error_message,
        parent_message=message.parent_message_id,
        thread_id=message.thread_id,
        user_rating=message.user_rating,
        is_regenerated=message.is_regenerated,
        regeneration_count=message.regeneration_count,
        vector_id=message.vector_id,
        mem0_reference=message.mem0_reference,
        created_at=message.created_at,
        updated_at=message.updated_at,
        completed_at=message.completed_at,
        attachments=attachment_payload,
    )


@chat_router.get("/", response=List[ChatListResponse], auth=auth_bearer_instance)
@paginate(PageNumberPagination, page_size=20)
async def list_chats(request):
    user = request.auth
    chats = Chat.objects.filter(user=user).select_related("user").order_by("-updated_at")
    return [ChatListResponse.from_orm(chat) for chat in await chat_list_sync(chats)]

async def chat_list_sync(chats):
    return [chat async for chat in chats]


@chat_router.post("/", response=ChatResponse, auth=auth_bearer_instance)
@apply_rate_limit(namespace="create_chat", limit=10, window=60)  # 10 chats per minute
async def create_chat(request, data: ChatCreateRequest):
    user = request.auth
    try:
        chat = await chat_pipeline.create_chat(
            user=user,
            title=data.title or "New Chat",
            model=data.model or user.preferred_model or "gpt-4o-mini",
            system_prompt=data.system_prompt,
            initial_message=data.initial_message,
            chat_id=str(data.id) if data.id else None,
        )
        # Manually create response to avoid async issues
        return ChatResponse(
            id=str(chat.id),
            title=chat.title,
            model_used=chat.model_used,
            created_at=chat.created_at,
            updated_at=chat.updated_at,
            message_count=chat.message_count,
            total_tokens_used=chat.total_tokens_used,
            estimated_cost=chat.estimated_cost,
            is_archived=chat.is_archived,
            mem0_memory_id=chat.mem0_memory_id,
            messages=[]  # Empty for new chat
        )
    except RateLimitExceededError:
        raise HttpError(429, "Rate limit exceeded")


@chat_router.get("/{chat_id}/messages", response=List[MessageResponse], auth=auth_bearer_instance)
async def get_chat_messages(request, chat_id: str):
    user = request.auth
    try:
        await Chat.objects.select_related("user").aget(id=chat_id, user=user)
    except Chat.DoesNotExist:
        # Chat doesn't exist yet (instant chat flow) - return empty messages
        return []

    queryset = (
        Message.objects.filter(chat_id=chat_id)
        .order_by("created_at")
        .select_related("parent_message")
        .prefetch_related(Prefetch("attachments"))
    )

    def _fetch_messages() -> list[Message]:
        return list(queryset)

    messages = await sync_to_async(_fetch_messages, thread_sensitive=True)()
    serialized: list[MessageResponse] = []
    for message in messages:
        serialized.append(await serialize_message(message))
    return serialized


@chat_router.post("/{chat_id}/messages", auth=auth_bearer_instance)
@apply_rate_limit(namespace="send_message", limit=20, window=60)  # 20 messages per minute
async def send_message(request, chat_id: str, data: MessageCreateRequest):
    user = request.auth

    # Try to get existing chat, create if doesn't exist (instant chat support)
    try:
        chat = await Chat.objects.select_related("user").aget(id=chat_id, user=user)
    except Chat.DoesNotExist:
        # Auto-create chat for instant chat flow
        from django.utils import timezone

        # Generate title from message content (first 50 chars)
        title = data.content[:50] + ("..." if len(data.content) > 50 else "")

        preferred_model = (
            data.model
            or getattr(user, "preferred_model", None)
            or "gpt-4o-mini"
        )

        chat = await Chat.objects.acreate(
            id=chat_id,  # Use the provided chat_id from frontend
            user=user,
            title=title,
            model_used=preferred_model,
            created_at=timezone.now(),
        )

    if not await MessageService.check_user_message_limit(user):
        raise HttpError(402, "Monthly message limit reached")

    try:
        outcome = await chat_pipeline.send_user_message(
            chat=chat,
            content=data.content,
            model=data.model,
            attachments=data.attachments,
        )
    except RateLimitExceededError:
        raise HttpError(429, "Rate limit exceeded")

    user_payload = await serialize_message(outcome.message)

    def _schema_to_dict(schema_obj):
        if hasattr(schema_obj, "model_dump"):
            return schema_obj.model_dump()
        if hasattr(schema_obj, "dict"):
            return schema_obj.dict()
        if hasattr(schema_obj, "model_dump_json"):
            return json.loads(schema_obj.model_dump_json())
        return json.loads(schema_obj.json())

    user_payload_data = _schema_to_dict(user_payload)

    # Check if client wants streaming response
    accept_header = request.headers.get("Accept", "")
    if "text/event-stream" in accept_header:
        logger.info(
            "🎯 STREAMING REQUEST for chat %s user_message=%s assistant=%s",
            chat_id,
            outcome.message.id,
            getattr(outcome.assistant_message, "id", None),
        )
        try:
            assistant_payload_data = None
            if outcome.assistant_message is not None:
                assistant_payload = await serialize_message(outcome.assistant_message)
                assistant_payload_data = _schema_to_dict(assistant_payload)

            return stream_ai_response(
                assistant_message_id=str(outcome.assistant_message.id)
                if outcome.assistant_message
                else None,
                user_message_payload=user_payload_data,
                assistant_message_payload=assistant_payload_data,
                queued_ai=outcome.queued_ai,
            )
        except Exception as e:
            logger.error(f"❌ STREAMING ERROR: {e}")
            # Fallback to normal response
            from django.http import JsonResponse
            response = JsonResponse(user_payload_data)
            response["Access-Control-Allow-Origin"] = "http://localhost:3000"
            response["Access-Control-Allow-Credentials"] = "true"
            return response

    # Add CORS headers for normal JSON response too
    from django.http import JsonResponse
    response = JsonResponse(user_payload_data)
    response["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response["Access-Control-Allow-Credentials"] = "true"
    return response


def stream_ai_response(
    *,
    assistant_message_id: str | None,
    user_message_payload: dict,
    assistant_message_payload: dict | None,
    queued_ai: bool,
):
    """Stream real-time updates for an assistant message using Server-Sent Events."""

    def event_stream():
        last_content = ""
        last_status = None
        check_interval = 0.1  # 100ms
        max_wait_time = 45.0  # seconds
        start_time = time.monotonic()

        initial_payload = {
            "type": "connected",
            "user_message": user_message_payload,
            "assistant_message": assistant_message_payload,
            "queued_ai": queued_ai,
        }
        yield f"data: {json.dumps(initial_payload, default=str)}\n\n"

        if not assistant_message_id:
            yield f"data: {json.dumps({'type': 'error', 'error': 'assistant-message-missing'})}\n\n"
            return

        if not queued_ai:
            try:
                skipped_message = Message.objects.get(id=assistant_message_id)
            except Message.DoesNotExist:
                yield f"data: {json.dumps({'type': 'error', 'error': 'assistant-message-missing'})}\n\n"
                return
            if skipped_message.status == "processing":
                skipped_message.status = "failed"
                skipped_message.error_message = (
                    skipped_message.error_message
                    or "AI response dispatch skipped"
                )
                skipped_message.save(
                    update_fields=["status", "error_message", "updated_at"]
                )
            completion = {
                "type": "completion",
                "content": skipped_message.content or "",
                "status": skipped_message.status or "skipped",
                "message_id": str(skipped_message.id),
                "error_message": skipped_message.error_message,
                "queued_ai": False,
            }
            yield f"data: {json.dumps(completion, default=str)}\n\n"
            return

        while (time.monotonic() - start_time) < max_wait_time:
            try:
                message = Message.objects.select_related("chat").get(
                    id=assistant_message_id
                )
            except Message.DoesNotExist:
                time.sleep(check_interval)
                continue

            current_content = message.content or ""
            if len(current_content) > len(last_content):
                delta = current_content[len(last_content) :]
                payload = {
                    "type": "content_delta",
                    "content": delta,
                    "total_content": current_content,
                    "status": message.status,
                    "message_id": str(message.id),
                }
                yield f"data: {json.dumps(payload, default=str)}\n\n"
                last_content = current_content

            if message.status in {"completed", "failed"}:
                completion = {
                    "type": "completion",
                    "content": current_content,
                    "status": message.status,
                    "message_id": str(message.id),
                    "error_message": message.error_message,
                }
                yield f"data: {json.dumps(completion, default=str)}\n\n"
                break

            last_status = message.status
            time.sleep(check_interval)

        else:
            timeout_payload = {
                "type": "timeout",
                "message_id": assistant_message_id,
                "last_status": last_status,
            }
            yield f"data: {json.dumps(timeout_payload, default=str)}\n\n"

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response["Access-Control-Allow-Credentials"] = "true"
    response["X-Accel-Buffering"] = "no"

    return response


@chat_router.post(
    "/{chat_id}/messages/{message_id}/regenerate",
    response=MessageResponse,
    auth=auth_bearer_instance,
)
async def regenerate_message(
    request,
    chat_id: str,
    message_id: str,
    data: MessageRegenerateRequest | None = None,
):
    user = request.auth
    try:
        message = await Message.objects.select_related("chat").aget(
            id=message_id, chat_id=chat_id, chat__user=user
        )
    except Message.DoesNotExist:
        raise HttpError(404, "Message not found")

    if message.role != "assistant":
        raise HttpError(400, "Only assistant messages can be regenerated")

    message = await chat_pipeline.mark_assistant_regeneration(message)

    model = data.model if data and data.model else (message.model_used or message.chat.model_used)
    chat_pipeline.enqueue_regeneration(
        message_id=str(message.id),
        model=model,
        assistant_message_id=str(message.id),
    )

    return await serialize_message(message)


@chat_router.put(
    "/{chat_id}/messages/{message_id}",
    response=MessageResponse,
    auth=auth_bearer_instance,
)
async def edit_message(request, chat_id: str, message_id: str, data: MessageEditRequest):
    user = request.auth

    try:
        message = await Message.objects.select_related("chat").aget(
            id=message_id, chat_id=chat_id, chat__user=user
        )
    except Message.DoesNotExist:
        raise HttpError(404, "Message not found")

    if message.role != "user":
        raise HttpError(400, "Only user messages can be edited")

    message = await chat_pipeline.mark_user_message_edit(message, data.content)

    chat_pipeline.enqueue_ai_response(
        chat_id=str(message.chat_id),
        user_message_id=str(message.id),
        model=message.chat.model_used,
    )

    return await serialize_message(message)
