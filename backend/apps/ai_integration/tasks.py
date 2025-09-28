import asyncio
import logging

from celery import shared_task
from django.db.models import F
from django.utils import timezone

from apps.authentication.models import User
from apps.chats.models import Message

from .models import AIModel, ConversationMemory, UsageTracking
from .services import Mem0Service

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2)
def update_memory(self, chat_id: str, message_id: str):
    try:
        message = Message.objects.select_related("chat", "chat__user").get(id=message_id)
        chat = message.chat
        if not chat.mem0_memory_id:
            return
        mem0_service = Mem0Service()
        recent_messages = list(
            Message.objects.filter(chat=chat, status="completed")
            .order_by("-created_at")[:5]
        )
        asyncio.run(
            mem0_service.add_conversation_memory(chat.mem0_memory_id, recent_messages, str(chat.user_id))
        )
        ConversationMemory.objects.filter(chat=chat).update(
            total_memories=F("total_memories") + 1,
            last_updated=timezone.now(),
        )
    except Exception as exc:  # pragma: no cover
        logger.error("Memory update failed: %s", exc)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30)


@shared_task
def track_usage(user_id: str, model: str, tokens_used: int):
    try:
        ai_model = AIModel.objects.get(name=model)
        estimated_cost = (tokens_used / 1_000_000) * float(ai_model.input_price_per_million)
    except AIModel.DoesNotExist:
        estimated_cost = 0.0

    UsageTracking.objects.create(
        user_id=user_id,
        model_used=model,
        operation_type="chat",
        total_tokens=tokens_used,
        estimated_cost=estimated_cost,
    )

    User.objects.filter(id=user_id).update(
        monthly_message_count=F("monthly_message_count") + 1
    )

