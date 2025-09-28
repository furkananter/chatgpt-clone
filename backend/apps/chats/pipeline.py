from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Iterable

from asgiref.sync import sync_to_async
from django.conf import settings
from django.utils import timezone

from .models import Chat, Message
from .services import ChatService, MessageService

logger = logging.getLogger(__name__)


@dataclass(slots=True, frozen=True)
class DispatchOutcome:
    """Encapsulates the result of queuing background work after saving a message."""

    message: Message
    assistant_message: Message | None
    queued_ai: bool
    queued_attachments: bool


class ChatPipeline:
    """High-level orchestration for chat creation and message workflows."""

    async def create_chat(
        self,
        *,
        user,
        title: str | None,
        model: str,
        system_prompt: str | None,
        initial_message: str | None,
        chat_id: str | None = None,  # Accept optional chat ID
    ) -> Chat:
        return await ChatService.create_chat(
            user=user,
            title=title,
            model=model,
            system_prompt=system_prompt,
            initial_message=initial_message,
            chat_id=chat_id,
        )

    async def send_user_message(
        self,
        *,
        chat: Chat,
        content: str,
        model: str | None,
        attachments: Iterable[dict[str, object]] | None,
    ) -> DispatchOutcome:
        resolved_model = model or chat.model_used
        message = await MessageService.create_message(
            chat=chat,
            content=content,
            role="user",
            attachments=attachments,
        )

        assistant_placeholder = await MessageService.create_assistant_placeholder(
            chat=chat,
            parent_message=message,
            model=resolved_model,
        )

        has_attachments = bool(attachments)
        queued_attachments = self._enqueue_attachment_processing(
            message, has_attachments
        )
        queued_ai = self.enqueue_ai_response(
            chat_id=str(chat.id),
            user_message_id=str(message.id),
            model=resolved_model,
            assistant_message_id=str(assistant_placeholder.id),
        )
        return DispatchOutcome(
            message=message,
            assistant_message=assistant_placeholder,
            queued_ai=queued_ai,
            queued_attachments=queued_attachments,
        )

    async def mark_user_message_edit(
        self, message: Message, new_content: str
    ) -> Message:
        def _apply_edit() -> Message:
            message.content = new_content
            message.status = "completed"
            message.error_message = ""
            message.save(
                update_fields=["content", "status", "error_message", "updated_at"]
            )
            Message.objects.filter(parent_message=message).update(
                status="cancelled",
                error_message="Superseded after user edit",
                updated_at=timezone.now(),
            )
            return message

        return await sync_to_async(_apply_edit, thread_sensitive=True)()

    async def mark_assistant_regeneration(self, message: Message) -> Message:
        def _mark_processing() -> Message:
            message.status = "processing"
            message.error_message = ""
            message.save(update_fields=["status", "error_message", "updated_at"])
            return message

        return await sync_to_async(_mark_processing, thread_sensitive=True)()

    def enqueue_ai_response(
        self,
        *,
        chat_id: str,
        user_message_id: str,
        model: str,
        assistant_message_id: str | None = None,
    ) -> bool:
        if not getattr(settings, "OPENROUTER_API_KEY", None):
            logger.warning("OPENROUTER_API_KEY missing; skipping AI dispatch")
            return False

        from .tasks import (
            generate_ai_response,
        )  # local import avoids circular dependency

        # Execute in a separate thread to avoid blocking the request
        import threading

        thread = threading.Thread(
            target=generate_ai_response,
            args=(chat_id, user_message_id, model, assistant_message_id),
        )
        thread.start()
        return True

    def enqueue_regeneration(
        self, *, message_id: str, model: str, assistant_message_id: str | None = None
    ) -> bool:
        if not getattr(settings, "OPENROUTER_API_KEY", None):
            logger.warning("OPENROUTER_API_KEY missing; skipping regenerate dispatch")
            return False

        from .tasks import (
            regenerate_ai_response,
        )  # local import avoids circular dependency

        # Execute in a separate thread to avoid blocking the request
        import threading

        thread = threading.Thread(
            target=regenerate_ai_response,
            args=(message_id, model, assistant_message_id),
        )
        thread.start()
        return True

    @staticmethod
    def _enqueue_attachment_processing(message: Message, has_attachments: bool) -> bool:
        if not has_attachments:
            return False

        from .tasks import process_message_attachments

        # Execute in a separate thread to avoid blocking the request
        import threading

        thread = threading.Thread(
            target=process_message_attachments, args=(str(message.id),)
        )
        thread.start()
        return True


chat_pipeline = ChatPipeline()
