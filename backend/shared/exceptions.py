class RateLimitExceededError(Exception):
    """Raised when a rate limit threshold is exceeded."""


class ModelNotConfiguredError(Exception):
    """Raised when an expected AI model configuration is missing."""
