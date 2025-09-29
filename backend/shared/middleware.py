import re
import logging
from typing import Dict

from django.conf import settings
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

from .rate_limiting import RateLimiter

logger = logging.getLogger(__name__)


class RateLimitMiddleware(MiddlewareMixin):
    RATE_LIMITS: Dict[str, Dict[str, int]] = {
        r"/api/v1/auth/": {"limit": 10, "window": 300},
        r"/api/v1/chats/": {"limit": 100, "window": 3600},
        r"/api/v1/chats/.+/messages": {"limit": 100, "window": 3600},
    }

    def process_request(self, request):
        if settings.DEBUG:
            return None
        user = getattr(request, "user", None)
        if user and getattr(user, "is_staff", False):
            return None

        client_id = self.get_client_identifier(request)
        for pattern, limits in self.RATE_LIMITS.items():
            if re.match(pattern, request.path):
                key = f"rate_limit:{pattern}:{client_id}"
                allowed, remaining = RateLimiter.check_rate_limit(
                    key=key, limit=limits["limit"], window=limits["window"]
                )
                if not allowed:
                    logger.warning(
                        "Rate limit exceeded for %s on %s", client_id, request.path
                    )
                    return JsonResponse(
                        {
                            "error": "Rate limit exceeded",
                            "retry_after": limits["window"],
                        },
                        status=429,
                    )
                request.rate_limit_remaining = remaining
                break
        return None

    @staticmethod
    def get_client_identifier(request) -> str:
        if hasattr(request, "user") and request.user.is_authenticated:
            return f"user:{request.user.id}"
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return f"ip:{x_forwarded_for.split(',')[0].strip()}"
        return f"ip:{request.META.get('REMOTE_ADDR', 'unknown')}"


def rate_limit(limit: int, window: int, key_func=None):
    def decorator(func):
        def wrapper(request, *args, **kwargs):
            key_suffix = (
                key_func(request, *args, **kwargs)
                if key_func
                else request.META.get("REMOTE_ADDR", "anonymous")
            )
            key = f"func:{func.__name__}:{key_suffix}"
            allowed, _remaining = RateLimiter.check_rate_limit(key, limit, window)
            if not allowed:
                return JsonResponse(
                    {"error": "Rate limit exceeded", "retry_after": window},
                    status=429,
                )
            return func(request, *args, **kwargs)

        return wrapper

    return decorator
