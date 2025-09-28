import logging

logger = logging.getLogger(__name__)


def create_embeddings(message_id: str):
    from apps.chats.models import Message
    from .services import QdrantService

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
        raise

