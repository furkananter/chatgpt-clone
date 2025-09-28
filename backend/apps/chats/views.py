from typing import List

from django.db.models import Prefetch
from ninja import Query, Router
from ninja.errors import HttpError
from ninja.pagination import PageNumberPagination, paginate

from apps.authentication.models import User
from apps.authentication.views import auth_bearer_instance
from shared.rate_limiting import apply_rate_limit
from shared.exceptions import RateLimitExceededError

from .models import Chat, Message
from .schemas import (
    ChatCreateRequest,
    ChatListResponse,
    ChatResponse,
    ChatUpdateRequest,
    MessageCreateRequest,
    MessageEditRequest,
    MessageResponse,
)
from .services import ChatService, MessageService, ModelNotAvailableError

chat_router = Router(tags=["Chats"])


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
        chat = await ChatService.create_chat(
            user=user,
            title=data.title or "New Chat",
            model="gpt-4",
            system_prompt=None,
            initial_message=None
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
        chat = await Chat.objects.select_related("user").aget(id=chat_id, user=user)
        messages = Message.objects.filter(chat=chat).order_by("created_at")
        message_list = await message_list_sync(messages)
        return [
            MessageResponse(
                id=str(message.id),
                content=message.content,
                role=message.role,
                status=message.status,
                created_at=message.created_at,
                updated_at=message.updated_at,
                token_count=message.total_tokens,
                attachments=[],  # Skip attachments for now
                vector_id=message.vector_id,
                is_regenerated=message.is_regenerated,
                regeneration_count=message.regeneration_count
            ) for message in message_list
        ]
    except Chat.DoesNotExist:
        raise HttpError(404, "Chat not found")

async def message_list_sync(messages):
    return [message async for message in messages]


@chat_router.post("/{chat_id}/messages", response=MessageResponse, auth=auth_bearer_instance)
@apply_rate_limit(namespace="send_message", limit=20, window=60)  # 20 messages per minute
async def send_message(request, chat_id: str, data: MessageCreateRequest):
    user = request.auth
    try:
        chat = await Chat.objects.select_related("user").aget(id=chat_id, user=user)

        # Create user message
        message = await MessageService.create_message(
            chat=chat,
            content=data.content,
            role="user",
            attachments=data.attachments
        )

        return MessageResponse(
            id=str(message.id),
            content=message.content,
            role=message.role,
            status=message.status,
            created_at=message.created_at,
            updated_at=message.updated_at,
            token_count=message.total_tokens,
            attachments=[],  # Skip attachments for now
            vector_id=message.vector_id,
            is_regenerated=message.is_regenerated,
            regeneration_count=message.regeneration_count
        )
    except Chat.DoesNotExist:
        raise HttpError(404, "Chat not found")
    except RateLimitExceededError:
        raise HttpError(429, "Rate limit exceeded")


@chat_router.delete("/{chat_id}")
async def delete_chat(request, chat_id: str):
    return {"message": "Delete chat endpoint - temporarily disabled for setup"}


@chat_router.get("/{chat_id}/messages")
async def get_chat_messages(request, chat_id: str):
    return {"message": "Get messages endpoint - temporarily disabled for setup"}


@chat_router.post("/{chat_id}/messages")
async def send_message(request, chat_id: str):
    return {"message": "Send message endpoint - temporarily disabled for setup"}


@chat_router.post("/{chat_id}/messages/{message_id}/regenerate")
async def regenerate_message(request, chat_id: str, message_id: str):
    return {"message": "Regenerate message endpoint - temporarily disabled for setup"}


@chat_router.put("/{chat_id}/messages/{message_id}")
async def edit_message(request, chat_id: str, message_id: str):
    return {"message": "Edit message endpoint - temporarily disabled for setup"}

