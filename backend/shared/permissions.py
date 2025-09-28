from ninja.errors import HttpError

from .rate_limiting import RateLimiter


class RateLimitPermission:
    """Helper class for applying rate limits inside view logic."""

    def __init__(self, *, key_prefix: str, limit: int, window: int):
        self.key_prefix = key_prefix
        self.limit = limit
        self.window = window

    def enforce(self, identifier: str) -> None:
        key = f"{self.key_prefix}:{identifier}"
        allowed, _remaining = RateLimiter.check_rate_limit(key, self.limit, self.window)
        if not allowed:
            raise HttpError(429, "Rate limit exceeded")
