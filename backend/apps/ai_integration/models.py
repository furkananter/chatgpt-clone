from decimal import Decimal

from django.db import models

from apps.authentication.models import User
from apps.chats.models import Chat, Message


class AIModel(models.Model):
    MODEL_PROVIDERS = [
        ("openai", "OpenAI"),
        ("anthropic", "Anthropic"),
        ("google", "Google"),
        ("meta", "Meta"),
        ("cohere", "Cohere"),
        ("mistral", "Mistral"),
    ]

    name = models.CharField(max_length=100, unique=True)
    display_name = models.CharField(max_length=150)
    provider = models.CharField(max_length=20, choices=MODEL_PROVIDERS)
    openrouter_model_id = models.CharField(max_length=150)

    supports_vision = models.BooleanField(default=False)
    supports_function_calling = models.BooleanField(default=False)
    supports_streaming = models.BooleanField(default=True)
    max_context_length = models.PositiveIntegerField()
    max_output_tokens = models.PositiveIntegerField()

    input_price_per_million = models.DecimalField(max_digits=10, decimal_places=6)
    output_price_per_million = models.DecimalField(max_digits=10, decimal_places=6)

    is_active = models.BooleanField(default=True)
    requires_subscription = models.BooleanField(default=False)
    min_subscription_tier = models.CharField(max_length=20, blank=True)

    average_response_time_ms = models.PositiveIntegerField(default=0)
    reliability_score = models.FloatField(default=1.0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.display_name


class ConversationMemory(models.Model):
    chat = models.OneToOneField(Chat, on_delete=models.CASCADE, related_name="memory")
    mem0_memory_id = models.CharField(max_length=255, unique=True)

    total_memories = models.PositiveIntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)
    memory_summary = models.TextField(blank=True)

    memory_decay_enabled = models.BooleanField(default=True)
    max_memory_items = models.PositiveIntegerField(default=100)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Memory for chat {self.chat_id}"


class UsageTracking(models.Model):
    OPERATION_CHOICES = [
        ("chat", "Chat"),
        ("embedding", "Embedding"),
        ("memory", "Memory"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="usage_records")
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, null=True, blank=True)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, null=True, blank=True)

    model_used = models.CharField(max_length=100)
    operation_type = models.CharField(max_length=50, choices=OPERATION_CHOICES)

    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)

    estimated_cost = models.DecimalField(max_digits=10, decimal_places=6, default=Decimal("0"))

    response_time_ms = models.PositiveIntegerField(default=0)
    was_cached = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    def __str__(self) -> str:
        return f"Usage {self.model_used} for user {self.user_id}"

