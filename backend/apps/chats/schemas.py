from datetime import datetime
from typing import List, Optional
from uuid import UUID

from ninja import ModelSchema, Schema

from .models import Chat, Message, MessageAttachment


class MessageAttachmentSchema(ModelSchema):
    class Meta:
        model = MessageAttachment
        fields = [
            "file_name",
            "file_type",
            "file_size",
            "file_url",
            "mime_type",
            "is_processed",
            "extracted_text",
        ]


class MessageResponse(ModelSchema):
    attachments: List[MessageAttachmentSchema] | None = None
    parent_message: Optional[UUID] = None

    class Meta:
        model = Message
        fields = [
            "id",
            "role",
            "content",
            "raw_content",
            "model_used",
            "prompt_tokens",
            "completion_tokens",
            "total_tokens",
            "status",
            "error_message",
            "parent_message",
            "thread_id",
            "user_rating",
            "is_regenerated",
            "regeneration_count",
            "mem0_reference",
            "created_at",
            "updated_at",
            "completed_at",
        ]


class ChatResponse(ModelSchema):
    messages: List[MessageResponse] | None = None

    class Meta:
        model = Chat
        fields = [
            "id",
            "title",
            "is_title_generated",
            "model_used",
            "system_prompt",
            "temperature",
            "max_tokens",
            "mem0_memory_id",
            "qdrant_collection_id",
            "is_archived",
            "is_pinned",
            "is_shared",
            "share_token",
            "message_count",
            "total_tokens_used",
            "estimated_cost",
            "created_at",
            "updated_at",
            "last_message_at",
        ]


class ChatListResponse(ModelSchema):
    class Meta:
        model = Chat
        fields = [
            "id",
            "title",
            "model_used",
            "is_archived",
            "is_pinned",
            "message_count",
            "last_message_at",
            "created_at",
        ]


class ChatCreateRequest(Schema):
    id: Optional[UUID] = None  # Allow frontend to specify UUID
    title: Optional[str] = None
    system_prompt: Optional[str] = None
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    initial_message: Optional[str] = None


class ChatUpdateRequest(Schema):
    title: Optional[str] = None
    system_prompt: Optional[str] = None
    model_used: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    is_archived: Optional[bool] = None
    is_pinned: Optional[bool] = None
    is_shared: Optional[bool] = None


class MessageCreateAttachment(Schema):
    file_name: str
    file_type: str
    file_size: int
    file_url: str
    mime_type: str


class MessageCreateRequest(Schema):
    content: str
    model: Optional[str] = None
    attachments: Optional[list[MessageCreateAttachment]] = None


class MessageEditRequest(Schema):
    content: str


class MessageRegenerateRequest(Schema):
    model: Optional[str] = None


class ChatSearchQuery(Schema):
    archived: bool = False
    search: Optional[str] = None
