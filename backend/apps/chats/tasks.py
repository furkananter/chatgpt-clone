import asyncio
import logging
from typing import Any

from celery import shared_task
from django.utils import timezone

from apps.ai_integration.services import Mem0Service, OpenRouterAPIError, OpenRouterService
from shared.cache import CacheService

from .models import Chat, Message
from .services import MessageService

logger = logging.getLogger(__name__)


async def _stream_openrouter_response(*, request_kwargs: dict[str, Any]) -> tuple[str, int]:
    response_content = ""
    total_tokens = 0

    async for chunk in OpenRouterService.stream_completion(**request_kwargs):
        choices = chunk.get("choices")
        if choices:
            delta = choices[0].get("delta", {})
            response_content += delta.get("content", "")
        usage = chunk.get("usage")
        if usage:
            total_tokens = usage.get("total_tokens", total_tokens)

    return response_content, total_tokens


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_ai_response(self, chat_id: str, user_message_id: str, model: str):
    assistant_message = None
    try:
        message = Message.objects.select_related("chat", "chat__user").get(id=user_message_id)
        chat = message.chat
        user = chat.user

        if not MessageService.check_ai_rate_limit(user):
            raise Exception("AI response rate limit exceeded")

        context = MessageService.get_conversation_context(chat, limit=20)
        mem0_service = Mem0Service()
        memory_context = ""
        if chat.mem0_memory_id:
            memory_context = asyncio.run(
                mem0_service.get_relevant_memories(chat.mem0_memory_id, message.content)
            )

        assistant_message = Message.objects.create(
            chat=chat,
            role="assistant",
            content="",
            status="processing",
            model_used=model,
            parent_message=message,
        )

        request_kwargs = {
            "model": model,
            "messages": context + [{"role": "user", "content": message.content}],
            "memory_context": memory_context,
            "temperature": chat.temperature,
            "max_tokens": chat.max_tokens,
        }

        response_content, total_tokens = asyncio.run(
            _stream_openrouter_response(request_kwargs=request_kwargs)
        )

        assistant_message.content = response_content
        assistant_message.status = "completed"
        assistant_message.total_tokens = total_tokens
        assistant_message.completed_at = timezone.now()
        assistant_message.save(
            update_fields=["content", "status", "total_tokens", "completed_at", "updated_at"]
        )

        message_count = chat.messages.count()
        Chat.objects.filter(id=chat.id).update(
            message_count=message_count,
            last_message_at=timezone.now(),
            total_tokens_used=chat.total_tokens_used + total_tokens,
        )

        chat.refresh_from_db(fields=["message_count", "last_message_at", "total_tokens_used"])

        if chat.message_count <= 2 and not chat.title:
            chat.title = MessageService.generate_chat_title(response_content[:100])
            chat.is_title_generated = True
            chat.save(update_fields=["title", "is_title_generated", "updated_at"])

        CacheService.invalidate_user_cache(str(chat.user_id))

        from apps.ai_integration.tasks import track_usage, update_memory
        from apps.vector_store.tasks import create_embeddings

        update_memory.delay(chat_id, str(assistant_message.id))
        create_embeddings.delay(str(assistant_message.id))
        track_usage.delay(str(chat.user_id), model, total_tokens)

        return {
            "message_id": str(assistant_message.id),
            "tokens_used": total_tokens,
            "status": "completed",
        }
    except OpenRouterAPIError as exc:
        logger.error("OpenRouter API error: %s", exc)
        if assistant_message:
            assistant_message.status = "failed"
            assistant_message.error_message = str(exc)
            assistant_message.save(update_fields=["status", "error_message", "updated_at"])
        raise self.retry(exc=exc)
    except Exception as exc:  # pragma: no cover - unexpected
        logger.exception("Unexpected error generating response")
        if assistant_message:
            assistant_message.status = "failed"
            assistant_message.error_message = str(exc)
            assistant_message.save(update_fields=["status", "error_message", "updated_at"])
        raise


@shared_task(bind=True, max_retries=2)
def regenerate_ai_response(self, message_id: str, model: str):
    try:
        message = Message.objects.select_related("chat").get(id=message_id)
        parent = message.parent_message
        if not parent:
            raise ValueError("Cannot regenerate without original user message")
        return generate_ai_response.apply_async(
            kwargs={
                "chat_id": str(message.chat_id),
                "user_message_id": str(parent.id),
                "model": model,
            }
        )
    except Message.DoesNotExist:
        logger.error("Message %s not found for regeneration", message_id)
        raise


@shared_task(bind=True, max_retries=2)
def process_message_attachments(self, message_id: str):
    try:
        message = Message.objects.get(id=message_id)
        for attachment in message.attachments.all():
            attachment.is_processed = True
            attachment.save(update_fields=["is_processed", "updated_at"])
    except Message.DoesNotExist:
        logger.warning("Message %s no longer exists for attachment processing", message_id)

