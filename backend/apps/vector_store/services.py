import hashlib
import logging
import uuid
from typing import Any, Dict

from django.conf import settings

from qdrant_client import QdrantClient
from qdrant_client.http import models as qmodels

logger = logging.getLogger(__name__)


class QdrantService:
    _client: QdrantClient | None = None
    COLLECTION_NAME = "chatgpt_messages"
    VECTOR_SIZE = 1536

    @classmethod
    def get_client(cls) -> QdrantClient:
        if cls._client is None:
            cls._client = QdrantClient(
                host=settings.QDRANT_HOST,
                port=settings.QDRANT_PORT,
                api_key=settings.QDRANT_API_KEY or None,
            )
        return cls._client

    @classmethod
    def ensure_collection(cls) -> None:
        client = cls.get_client()
        if not client.has_collection(cls.COLLECTION_NAME):
            client.create_collection(
                collection_name=cls.COLLECTION_NAME,
                vectors_config=qmodels.VectorParams(
                    size=cls.VECTOR_SIZE,
                    distance=qmodels.Distance.COSINE,
                ),
            )

    @staticmethod
    def _generate_embedding(text: str) -> list[float]:
        digest = hashlib.sha256(text.encode("utf-8")).digest()
        base_vector = [byte / 255.0 for byte in digest]
        repeats, remainder = divmod(QdrantService.VECTOR_SIZE, len(base_vector))
        vector = base_vector * repeats + base_vector[:remainder]
        return vector

    @classmethod
    def create_message_embedding(
        cls,
        *,
        message_id: str,
        content: str,
        metadata: Dict[str, Any],
    ) -> str:
        cls.ensure_collection()
        client = cls.get_client()
        vector = cls._generate_embedding(content)
        point_id = str(uuid.uuid4())
        client.upsert(
            collection_name=cls.COLLECTION_NAME,
            points=[
                qmodels.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={"message_id": message_id, **metadata},
                )
            ],
        )
        return point_id

    @classmethod
    def delete_message_embedding(cls, message_id: str) -> None:
        client = cls.get_client()
        client.delete(
            collection_name=cls.COLLECTION_NAME,
            points_selector=qmodels.FilterSelector(
                filter=qmodels.Filter(
                    must=[
                        qmodels.FieldCondition(
                            key="message_id",
                            match=qmodels.MatchValue(value=message_id),
                        )
                    ]
                )
            ),
        )

