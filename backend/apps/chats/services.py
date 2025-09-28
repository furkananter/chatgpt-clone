import logging
from typing import Iterable

from asgiref.sync import sync_to_async
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from django.core.exceptions import ObjectDoesNotExist

from apps.authentication.models import User
from apps.ai_integration.services import Mem0Service
from shared.cache import CacheService, RateLimiter
from shared.exceptions import RateLimitExceededError

from .models import Chat, Message, MessageAttachment

logger = logging.getLogger(__name__)


class ModelNotAvailableError(Exception):
    pass


class ChatService:
    @staticmethod
    def _create_chat_atomic(
        user: User,
        title: str | None,
        model: str,
        system_prompt: str | None,
    ) -> Chat:
        with transaction.atomic():
            try:
                preferences = user.preferences
            except ObjectDoesNotExist:
                preferences = None

            chat = Chat.objects.create(
                user=user,
                title=title or "Untitled chat",
                model_used=model,
                system_prompt=system_prompt or "",
                temperature=(preferences.default_temperature if preferences else 0.7),
                max_tokens=(preferences.default_max_tokens if preferences else 1000),
            )
            return chat

    @staticmethod
    async def create_chat(
        *,
        user: User,
        title: str | None,
        model: str,
        system_prompt: str | None,
        initial_message: str | None,
    ) -> Chat:
        mem0_service = Mem0Service()

        chat = await sync_to_async(ChatService._create_chat_atomic, thread_sensitive=True)(
            user=user,
            title=title,
            model=model,
            system_prompt=system_prompt,
        )

        try:
            memory_id = await mem0_service.create_memory_context(str(user.id), str(chat.id))
        except Exception as exc:  # pragma: no cover - external service
            logger.warning("Unable to create memory context: %s", exc)
            memory_id = None

        if memory_id:
            chat.mem0_memory_id = memory_id
            await sync_to_async(chat.save, thread_sensitive=True)(update_fields=["mem0_memory_id"])

        if initial_message:
            await MessageService.create_message(
                chat=chat,
                role="system",
                content=initial_message,
                attachments=None,
            )

        CacheService.invalidate_user_cache(str(user.id))
        return chat

    @staticmethod
    async def update_chat(chat_id: str, *, user: User, updates: dict) -> Chat:
        async def _update() -> Chat:
            chat = Chat.objects.get(id=chat_id, user=user)
            for field, value in updates.items():
                setattr(chat, field, value)
            chat.save(update_fields=list(updates.keys()))
            return chat

        chat = await sync_to_async(_update, thread_sensitive=True)()
        CacheService.invalidate_user_cache(str(user.id))
        return chat

    @staticmethod
    async def delete_chat(chat_id: str, *, user: User) -> None:
        mem0_service = Mem0Service()

        async def _delete():
            chat = Chat.objects.get(id=chat_id, user=user)
            memory_id = chat.mem0_memory_id
            chat.delete()
            return memory_id

        memory_id = await sync_to_async(_delete, thread_sensitive=True)()
        if memory_id:
            await mem0_service.delete_memory_context(memory_id)
        CacheService.invalidate_user_cache(str(user.id))


class MessageService:
    RATE_LIMIT_PREFIX = "message:user"

    @staticmethod
    async def create_message(
        *,
        chat: Chat,
        content: str,
        role: str,
        attachments: Iterable[dict] | None,
    ) -> Message:
        def _create() -> Message:
            with transaction.atomic():
                message = Message.objects.create(
                    chat=chat,
                    content=content,
                    role=role,
                    status="completed" if role != "assistant" else "pending",
                )
                if attachments:
                    attachment_objs = [
                        MessageAttachment(
                            message=message,
                            file_name=item["file_name"],
                            file_type=item["file_type"],
                            file_size=item["file_size"],
                            file_url=item["file_url"],
                            mime_type=item["mime_type"],
                        )
                        for item in attachments
                    ]
                    MessageAttachment.objects.bulk_create(attachment_objs)
                Chat.objects.filter(id=chat.id).update(
                    message_count=F("message_count") + 1,
                    last_message_at=timezone.now(),
                )
                return message

        message = await sync_to_async(_create, thread_sensitive=True)()
        CacheService.invalidate_user_cache(str(chat.user_id))
        return message

    @staticmethod
    def get_conversation_context(chat: Chat, limit: int = 20) -> list[dict[str, str]]:
        messages = list(
            chat.messages.order_by("-created_at")[:limit].values("role", "content")
        )
        return [
            {"role": entry["role"], "content": entry["content"]}
            for entry in reversed(messages)
        ]

    @staticmethod
    async def edit_message(
        *,
        chat_id: str,
        message_id: str,
        user: User,
        new_content: str,
    ) -> Message:
        async def _edit() -> Message:
            message = Message.objects.select_for_update().get(
                id=message_id, chat_id=chat_id, chat__user=user
            )
            message.content = new_content
            message.status = "pending"
            message.is_regenerated = True
            message.regeneration_count = F("regeneration_count") + 1
            message.save()
            return message

        return await sync_to_async(_edit, thread_sensitive=True)()

    @staticmethod
    def generate_chat_title(content: str) -> str:
        return content.strip().split("\n")[0][:80] or "Chat"

    @staticmethod
    async def check_user_message_limit(user: User) -> bool:
        return user.monthly_message_count < user.monthly_message_limit

    @staticmethod
    def check_ai_rate_limit(user: User) -> bool:
        key = f"{MessageService.RATE_LIMIT_PREFIX}:{user.id}"
        allowed, _remaining = RateLimiter.check_rate_limit(key, limit=50, window=3600)
        return allowed

    @staticmethod
    async def increment_user_usage(user: User) -> None:
        await sync_to_async(
            lambda: User.objects.filter(id=user.id).update(
                monthly_message_count=F("monthly_message_count") + 1
            ),
            thread_sensitive=True,
        )()
