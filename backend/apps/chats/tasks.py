import asyncio
import logging
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

logger = logging.getLogger(__name__)


async def _stream_openrouter_response(
    *,
    request_kwargs: dict[str, Any],
    on_chunk: Callable[[str], Awaitable[None]] | None = None,
) -> tuple[str, int]:
    from apps.ai_integration.services import OpenRouterService
    response_content = ""
    total_tokens = 0
    chunk_count = 0

    try:
        async for chunk in OpenRouterService.stream_completion(**request_kwargs):
            chunk_count += 1
            logger.debug("Received chunk %d: %s", chunk_count, chunk)
            
            choices = chunk.get("choices")
            if choices:
                delta = choices[0].get("delta", {})
                content = delta.get("content", "")
                
                # Try alternative response formats
                if not content:
                    # Some APIs might return content directly in choices[0]
                    content = choices[0].get("content", "")
                    if content:
                        logger.debug("Found content directly in choices: '%s'", content)
                
                if content:
                    response_content += content
                    logger.debug("Added content: '%s'", content)
                    if on_chunk:
                        await on_chunk(response_content)
                else:
                    logger.debug("No content in delta: %s", delta)
            else:
                # Check if chunk has a different structure
                if "content" in chunk:
                    content = chunk.get("content", "")
                    if content:
                        response_content += content
                        logger.debug("Found content directly in chunk: '%s'", content)
                        if on_chunk:
                            await on_chunk(response_content)
                else:
                    logger.debug("No choices in chunk: %s", chunk)
                
            usage = chunk.get("usage")
            if usage:
                total_tokens = usage.get("total_tokens", total_tokens)
                logger.debug("Updated total_tokens: %d", total_tokens)

        logger.info("Stream completed: %d chunks, %d tokens, content length: %d", 
                   chunk_count, total_tokens, len(response_content))
        
        if not response_content:
            logger.warning("Empty response content received after %d chunks", chunk_count)
            
        return response_content, total_tokens
        
    except Exception as exc:
        logger.error("Error during streaming response: %s", exc)
        raise


@dataclass(slots=True)
class ConversationConfig:
    model: str
    messages: list[dict[str, str]]
    memory_context: str
    temperature: float
    max_tokens: int


def _fetch_mem0_context(
    mem0_service,
    *,
    memory_id: str | None,
    prompt: str,
) -> str:
    if not memory_id:
        return ""
    return asyncio.run(mem0_service.get_relevant_memories(memory_id, prompt))


def _build_conversation_config(
    *,
    chat,
    user_message,
    model: str,
    mem0_service,
):
    from apps.chats.services import MessageService

    history = MessageService.get_conversation_context(chat, limit=20)
    memory_context = _fetch_mem0_context(
        mem0_service,
        memory_id=chat.mem0_memory_id,
        prompt=user_message.content,
    )
    payload = history + [{"role": "user", "content": user_message.content}]
    return ConversationConfig(
        model=model,
        messages=payload,
        memory_context=memory_context,
        temperature=chat.temperature,
        max_tokens=chat.max_tokens,
    )


def _create_assistant_placeholder(
    *,
    chat,
    parent_message,
    model: str,
):
    from apps.chats.models import Message

    return Message.objects.create(
        chat=chat,
        role="assistant",
        content="",
        status="processing",
        model_used=model,
        parent_message=parent_message,
    )


def _finalize_assistant_success(
    assistant_message,
    *,
    content: str,
    total_tokens: int,
) -> None:
    from django.utils import timezone

    assistant_message.content = content
    assistant_message.status = "completed"
    assistant_message.total_tokens = total_tokens
    assistant_message.completed_at = timezone.now()
    assistant_message.save(
        update_fields=["content", "status", "total_tokens", "completed_at", "updated_at"]
    )


def _finalize_assistant_failure(assistant_message, error: str) -> None:
    assistant_message.status = "failed"
    assistant_message.error_message = error
    assistant_message.save(update_fields=["status", "error_message", "updated_at"])


def _update_chat_metrics(chat, *, total_tokens: int) -> None:
    from django.utils import timezone
    from apps.chats.models import Chat

    message_count = chat.messages.count()
    Chat.objects.filter(id=chat.id).update(
        message_count=message_count,
        last_message_at=timezone.now(),
        total_tokens_used=chat.total_tokens_used + total_tokens,
    )
    chat.refresh_from_db(fields=["message_count", "last_message_at", "total_tokens_used"])


def _maybe_generate_title(chat, *, assistant_preview: str) -> None:
    from apps.chats.services import MessageService

    if chat.message_count <= 2 and not chat.title:
        chat.title = MessageService.generate_chat_title(assistant_preview[:100])
        chat.is_title_generated = True
        chat.save(update_fields=["title", "is_title_generated", "updated_at"])


def _fan_out_post_process(
    *,
    chat,
    assistant_message,
    model: str,
    total_tokens: int,
) -> None:
    from apps.ai_integration.tasks import track_usage, update_memory
    from apps.vector_store.tasks import create_embeddings

    # Execute directly instead of queueing
    try:
        update_memory(str(chat.id), str(assistant_message.id))
    except Exception as e:
        logger.error("Error updating memory: %s", e)

    try:
        create_embeddings(str(assistant_message.id))
    except Exception as e:
        logger.error("Error creating embeddings: %s", e)

    try:
        track_usage(str(chat.user_id), model, total_tokens)
    except Exception as e:
        logger.error("Error tracking usage: %s", e)


def generate_ai_response(
    chat_id: str,
    user_message_id: str,
    model: str,
    assistant_message_id: str | None = None,
):
    from django.utils import timezone
    from asgiref.sync import sync_to_async
    from apps.ai_integration.services import (
        Mem0Service,
        OpenRouterAPIError,
        OpenRouterService,
    )
    from apps.chats.models import Chat, Message
    from apps.chats.services import MessageService
    from shared.cache import CacheService

    assistant_message = None
    try:
        message = Message.objects.select_related("chat", "chat__user").get(id=user_message_id)
        chat = message.chat
        user = chat.user

        if not MessageService.check_ai_rate_limit(user):
            raise Exception("AI response rate limit exceeded")

        resolved_model = OpenRouterService.resolve_model_id(model)
        mem0_service = Mem0Service()
        config = _build_conversation_config(
            chat=chat,
            user_message=message,
            model=resolved_model,
            mem0_service=mem0_service,
        )

        if assistant_message_id:
            try:
                assistant_message = Message.objects.select_related("chat").get(
                    id=assistant_message_id,
                    chat=chat,
                )
                assistant_message.content = ""
                assistant_message.status = "processing"
                assistant_message.error_message = ""
                assistant_message.save(
                    update_fields=["content", "status", "error_message", "updated_at"]
                )
            except Message.DoesNotExist:
                logger.warning(
                    "Assistant placeholder %s missing; recreating",
                    assistant_message_id,
                )
                assistant_message_id = None

        if not assistant_message:
            assistant_message = _create_assistant_placeholder(
                chat=chat,
                parent_message=message,
                model=resolved_model,
            )

        request_kwargs = {
            "model": config.model,
            "messages": config.messages,
            "memory_context": config.memory_context,
            "temperature": config.temperature,
            "max_tokens": config.max_tokens,
        }

        last_saved_length = 0

        def _apply_stream_update(partial: str) -> None:
            assistant_message.content = partial
            assistant_message.save(update_fields=["content", "updated_at"])

        async def _handle_stream_update(partial: str) -> None:
            nonlocal last_saved_length

            if not partial:
                return

            if len(partial) == last_saved_length:
                return

            last_saved_length = len(partial)
            await sync_to_async(_apply_stream_update, thread_sensitive=True)(partial)

        response_content, total_tokens = asyncio.run(
            _stream_openrouter_response(
                request_kwargs=request_kwargs,
                on_chunk=_handle_stream_update,
            )
        )

        if not response_content.strip():
            error_msg = "AI returned empty response"
            logger.error(error_msg)
            _finalize_assistant_failure(assistant_message, error_msg)
            raise Exception(error_msg)

        _finalize_assistant_success(
            assistant_message,
            content=response_content,
            total_tokens=total_tokens,
        )

        _update_chat_metrics(chat, total_tokens=total_tokens)
        _maybe_generate_title(chat, assistant_preview=response_content[:100])

        CacheService.invalidate_user_cache(str(chat.user_id))

        _fan_out_post_process(
            chat=chat,
            assistant_message=assistant_message,
            model=resolved_model,
            total_tokens=total_tokens,
        )

        return {
            "message_id": str(assistant_message.id),
            "tokens_used": total_tokens,
            "status": "completed",
        }
    except OpenRouterAPIError as exc:
        logger.error("OpenRouter API error: %s", exc)
        if assistant_message:
            _finalize_assistant_failure(assistant_message, str(exc))
        raise
    except Exception as exc:  # pragma: no cover - unexpected
        logger.exception("Unexpected error generating response")
        if assistant_message:
            _finalize_assistant_failure(assistant_message, str(exc))
        raise


def regenerate_ai_response(
    message_id: str, model: str, assistant_message_id: str | None = None
):
    from apps.chats.models import Message

    try:
        message = Message.objects.select_related("chat").get(id=message_id)
        parent = message.parent_message
        if not parent:
            raise ValueError("Cannot regenerate without original user message")
        return generate_ai_response(
            chat_id=str(message.chat_id),
            user_message_id=str(parent.id),
            model=model,
            assistant_message_id=assistant_message_id or str(message.id),
        )
    except Message.DoesNotExist:
        logger.error("Message %s not found for regeneration", message_id)
        raise


def process_message_attachments(message_id: str):
    from apps.chats.models import Message

    try:
        message = Message.objects.get(id=message_id)
        for attachment in message.attachments.all():
            attachment.is_processed = True
            attachment.save(update_fields=["is_processed", "updated_at"])
    except Message.DoesNotExist:
        logger.warning("Message %s no longer exists for attachment processing", message_id)
