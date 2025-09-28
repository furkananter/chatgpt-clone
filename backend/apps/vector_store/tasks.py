import logging

from celery import shared_task

from apps.chats.models import Message

from .services import QdrantService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2)
def create_embeddings(self, message_id: str):
    try:
        message = Message.objects.select_related("chat", "chat__user").get(id=message_id)
        vector_id = QdrantService.create_message_embedding(
            message_id=message_id,
            content=message.content,
            metadata={
                "chat_id": str(message.chat_id),
                "user_id": str(message.chat.user_id),
                "role": message.role,
                "created_at": message.created_at.isoformat(),
            },
        )
        message.vector_id = vector_id
        message.save(update_fields=["vector_id", "updated_at"])
    except Message.DoesNotExist:
        logger.warning("Message %s no longer exists for embedding", message_id)
    except Exception as exc:  # pragma: no cover
        logger.error("Embedding creation failed: %s", exc)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc, countdown=30)

