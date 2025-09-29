import uuid

from django.db import models
from django.utils import timezone

from apps.authentication.models import User


class Chat(models.Model):
    """Main chat conversation container."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="chats")

    title = models.CharField(max_length=255, blank=True)
    is_title_generated = models.BooleanField(default=False)

    model_used = models.CharField(max_length=100, default="gpt-4o-mini")
    system_prompt = models.TextField(blank=True)
    temperature = models.FloatField(default=0.7)
    max_tokens = models.PositiveIntegerField(default=1000)

    is_archived = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)
    is_shared = models.BooleanField(default=False)
    share_token = models.UUIDField(null=True, blank=True, unique=True)

    message_count = models.PositiveIntegerField(default=0)
    total_tokens_used = models.PositiveIntegerField(default=0)
    estimated_cost = models.DecimalField(max_digits=10, decimal_places=6, default=0)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self) -> str:
        return self.title or f"Chat {self.id}"  # pragma: no cover simple repr


class Message(models.Model):
    """Individual messages within chats."""

    ROLE_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant"),
        ("system", "System"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("processing", "Processing"),
        ("completed", "Completed"),
        ("failed", "Failed"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")

    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    raw_content = models.TextField(blank=True)

    model_used = models.CharField(max_length=100, blank=True)
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    processing_time_ms = models.PositiveIntegerField(default=0)

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default="pending")
    error_message = models.TextField(blank=True)

    parent_message = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="children",
    )
    thread_id = models.UUIDField(null=True, blank=True)

    user_rating = models.IntegerField(null=True, blank=True)
    is_regenerated = models.BooleanField(default=False)
    regeneration_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]

    def mark_completed(self, tokens: int, error: str | None = None) -> None:
        self.total_tokens = tokens
        self.status = "completed" if not error else "failed"
        if error:
            self.error_message = error
        self.completed_at = timezone.now()
        self.save()


class MessageAttachment(models.Model):
    ATTACHMENT_TYPES = [
        ("image", "Image"),
        ("document", "Document"),
        ("audio", "Audio"),
        ("video", "Video"),
        ("other", "Other"),
    ]

    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="attachments"
    )
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=20, choices=ATTACHMENT_TYPES)
    file_size = models.PositiveIntegerField()
    file_url = models.URLField()
    mime_type = models.CharField(max_length=100)

    is_processed = models.BooleanField(default=False)
    extracted_text = models.TextField(blank=True)
    processing_error = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.file_name
