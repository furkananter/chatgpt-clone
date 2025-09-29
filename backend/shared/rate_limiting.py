from functools import wraps
from inspect import iscoroutinefunction
from django.http import HttpRequest
from shared.exceptions import RateLimitExceededError
from .cache import RateLimiter


def _build_key(request: HttpRequest, namespace: str) -> str:
    if hasattr(request, "user") and request.user.is_authenticated:
        identifier = f"user:{request.user.id}"
    else:
        identifier = f"ip:{request.META.get('REMOTE_ADDR', 'anonymous')}"
    return f"{namespace}:{identifier}"


def apply_rate_limit(namespace: str, limit: int, window: int):
    def decorator(func):
        if iscoroutinefunction(func):

            @wraps(func)
            async def async_wrapper(request, *args, **kwargs):
                key = _build_key(request, namespace)
                allowed, _remaining = RateLimiter.check_rate_limit(key, limit, window)
                if not allowed:
                    raise RateLimitExceededError()
                return await func(request, *args, **kwargs)

            return async_wrapper

        @wraps(func)
        def sync_wrapper(request, *args, **kwargs):
            key = _build_key(request, namespace)
            allowed, _remaining = RateLimiter.check_rate_limit(key, limit, window)
            if not allowed:
                raise RateLimitExceededError()
            return func(request, *args, **kwargs)

        return sync_wrapper

    return decorator
