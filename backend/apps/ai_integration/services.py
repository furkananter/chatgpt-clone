import asyncio
import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx
from django.conf import settings
from django.db.models import Q

from apps.chats.models import Message

from .models import AIModel, ConversationMemory, UsageTracking

logger = logging.getLogger(__name__)

try:  # pragma: no cover - optional dependency
    from mem0 import Memory
except ImportError:  # pragma: no cover - fallback behaviour
    Memory = None  # type: ignore


class OpenRouterAPIError(Exception):
    pass


class OpenRouterService:
    BASE_URL = "https://openrouter.ai/api/v1"
    DEFAULT_MODEL = "google/gemini-2.5-flash"

    @classmethod
    def get_headers(cls) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "HTTP-Referrer": settings.SITE_URL,
            "X-Title": "ChatGPT Clone",
            "Content-Type": "application/json",
        }

    @classmethod
    async def stream_completion(
        cls,
        *,
        model: str,
        messages: List[Dict[str, str]],
        memory_context: str = "",
        temperature: float = 0.7,
        max_tokens: int = 1000,
        **kwargs,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        system_message = {
            "role": "system",
            "content": f"You are a helpful AI assistant. {memory_context}",
        }
        payload = {
            "model": model,
            "messages": [system_message] + messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        payload.update(kwargs)

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{cls.BASE_URL}/chat/completions",
                    headers=cls.get_headers(),
                    json=payload,
                ) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        raise OpenRouterAPIError(
                            f"API request failed: {response.status_code} - {error_body.decode()}"
                        )

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue
                        data = line[6:]
                        if data == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            yield chunk
                        except json.JSONDecodeError:
                            logger.debug("Invalid JSON chunk: %s", data)
                            continue
        except httpx.TimeoutException as exc:  # pragma: no cover
            raise OpenRouterAPIError("Request timeout") from exc
        except httpx.RequestError as exc:  # pragma: no cover
            raise OpenRouterAPIError(f"Request error: {exc}") from exc

    @classmethod
    def resolve_model_id(cls, raw_model: str | None) -> str:
        """Map friendly names to OpenRouter-compatible identifiers."""

        candidate = (raw_model or "").strip()
        if not candidate:
            logger.debug("No model provided. Falling back to %s", cls.DEFAULT_MODEL)
            return cls.DEFAULT_MODEL

        if "/" in candidate:
            return candidate

        try:
            record = AIModel.objects.get(
                Q(name__iexact=candidate)
                | Q(display_name__iexact=candidate)
                | Q(openrouter_model_id__iexact=candidate)
            )
            return record.openrouter_model_id
        except AIModel.DoesNotExist:
            logger.warning(
                "Unknown OpenRouter model '%s'. Falling back to %s",
                candidate,
                cls.DEFAULT_MODEL,
            )
            return cls.DEFAULT_MODEL

    @classmethod
    async def get_available_models(cls) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(
                    f"{cls.BASE_URL}/models", headers=cls.get_headers()
                )
                response.raise_for_status()
                data = response.json()
                return data.get("data", [])
        except Exception as exc:  # pragma: no cover
            logger.error("Error fetching models: %s", exc)
            return []

    @classmethod
    async def estimate_cost(
        cls, *, model: str, input_tokens: int, output_tokens: int = 0
    ) -> float:
        try:
            ai_model = await AIModel.objects.aget(openrouter_model_id=model)
            input_cost = (input_tokens / 1_000_000) * float(
                ai_model.input_price_per_million
            )
            output_cost = (output_tokens / 1_000_000) * float(
                ai_model.output_price_per_million
            )
            return input_cost + output_cost
        except AIModel.DoesNotExist:
            logger.warning("Model %s not found in database", model)
            return 0.0


class MemoryServiceError(Exception):
    pass


class Mem0Service:
    def __init__(self):
        if Memory is None:
            self.memory = None
        else:
            # Use OpenAI with gpt-4o-mini for Mem0
            try:
                config = {
                    "llm": {
                        "provider": "openai",
                        "config": {
                            "model": "gpt-4o-mini",
                            "api_key": settings.OPENAI_API_KEY,
                        },
                    },
                    "version": "v1.1",
                }
                self.memory = Memory.from_config(config)
                logger.info("Mem0 initialized successfully with OpenAI gpt-4o-mini")
            except Exception as e:
                logger.warning("Failed to initialize Mem0, disabling memory: %s", e)
                self.memory = None

    async def _run_async(self, func, *args, **kwargs):
        if self.memory is None:
            return None
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, lambda: func(*args, **kwargs))

    async def create_memory_context(self, user_id: str, chat_id: str) -> Optional[str]:
        memory_id = f"{user_id}_{chat_id}"
        if self.memory is None:
            return memory_id
        try:
            # Skip initial memory creation - just create the record
            await ConversationMemory.objects.aupdate_or_create(
                chat_id=chat_id,
                defaults={"mem0_memory_id": memory_id},
            )
            return memory_id
        except Exception as exc:  # pragma: no cover
            logger.error("Failed to create memory context: %s", exc)
            raise MemoryServiceError(str(exc)) from exc

    async def add_conversation_memory(
        self, memory_id: str, messages: List[Message], user_id: str
    ):
        if self.memory is None:
            return
        # Only process last few messages to reduce vector operations
        recent_messages = messages[-3:] if len(messages) > 3 else messages
        payload = [
            {"role": msg.role, "content": msg.content} for msg in recent_messages
        ]

        # Skip if no meaningful content
        if not any(msg.content.strip() for msg in recent_messages):
            return

        # Skip very short messages to reduce noise
        if all(len(msg.content.strip()) < 10 for msg in recent_messages):
            return

        await self._run_async(self.memory.add, messages=payload, user_id=memory_id)

    async def get_relevant_memories(
        self, memory_id: str, query: str, limit: int = 5
    ) -> str:
        if self.memory is None:
            return ""
        try:
            memories = await self._run_async(
                self.memory.search,
                query=query,
                user_id=memory_id,
                limit=limit,
            )
        except Exception as exc:  # pragma: no cover
            logger.warning("Failed to retrieve memories: %s", exc)
            return ""

        context_parts: list[str] = []
        for item in memories or []:
            text: Optional[str] = None
            if isinstance(item, dict):
                text = item.get("text") or item.get("content") or item.get("value")
                if not text and isinstance(item.get("payload"), dict):
                    payload = item["payload"]
                    text = payload.get("text") or payload.get("content")
            elif isinstance(item, str):
                text = item
            else:
                text = str(item)

            if text:
                context_parts.append(f"Memory: {text}")

        return "\n".join(context_parts)

    async def update_memory(
        self,
        memory_id: str,
        memory_text: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        if self.memory is None:
            return
        await self._run_async(
            self.memory.update,
            memory_id=memory_id,
            data=memory_text,
            metadata=metadata or {},
        )

    async def delete_memory_context(self, memory_id: str) -> None:
        if self.memory is None:
            return
        await self._run_async(self.memory.delete_all, user_id=memory_id)


async def record_usage(
    *,
    user_id: str,
    chat_id: Optional[str],
    message_id: Optional[str],
    model: str,
    operation_type: str,
    tokens: int,
    cost: float,
    response_time_ms: int = 0,
    was_cached: bool = False,
) -> UsageTracking:
    return await UsageTracking.objects.acreate(
        user_id=user_id,
        chat_id=chat_id,
        message_id=message_id,
        model_used=model,
        operation_type=operation_type,
        total_tokens=tokens,
        estimated_cost=cost,
        response_time_ms=response_time_ms,
        was_cached=was_cached,
    )
