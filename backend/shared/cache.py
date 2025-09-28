import hashlib
import json
from typing import Any, Optional, Tuple

from django.core.cache import caches


class CacheService:
    """Utility helpers for interacting with named caches."""

    @staticmethod
    def get_cache(alias: str = "default"):
        return caches[alias]

    @staticmethod
    def generate_cache_key(prefix: str, *args, **kwargs) -> str:
        key_data = f"{prefix}:{':'.join(map(str, args))}"
        if kwargs:
            serialized = json.dumps(kwargs, sort_keys=True)
            key_data += f":{hashlib.md5(serialized.encode()).hexdigest()}"
        return key_data

    @staticmethod
    def cache_user_chats(user_id: str, chats_data: list, timeout: int = 300) -> None:
        cache = CacheService.get_cache()
        key = CacheService.generate_cache_key("user_chats", user_id)
        cache.set(key, chats_data, timeout)

    @staticmethod
    def get_cached_user_chats(user_id: str) -> Optional[list]:
        cache = CacheService.get_cache()
        key = CacheService.generate_cache_key("user_chats", user_id)
        return cache.get(key)

    @staticmethod
    def cache_chat_messages(
        chat_id: str, messages_data: list, timeout: int = 600
    ) -> None:
        cache = CacheService.get_cache()
        key = CacheService.generate_cache_key("chat_messages", chat_id)
        cache.set(key, messages_data, timeout)

    @staticmethod
    def invalidate_user_cache(user_id: str) -> None:
        cache = CacheService.get_cache()
        cache.delete(CacheService.generate_cache_key("user_chats", user_id))
        cache.delete(CacheService.generate_cache_key("user_profile", user_id))


class RateLimiter:
    @staticmethod
    def check_rate_limit(key: str, limit: int, window: int) -> Tuple[bool, int]:
        cache = CacheService.get_cache("rate_limiting")
        current = cache.get(key, 0)
        if current >= limit:
            return False, 0
        cache.set(key, current + 1, window)
        return True, limit - current - 1

    @staticmethod
    def reset_rate_limit(key: str) -> None:
        cache = CacheService.get_cache("rate_limiting")
        cache.delete(key)
