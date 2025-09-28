from __future__ import annotations

from django.db import models

from apps.authentication.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    bio = models.TextField(blank=True)
    timezone = models.CharField(max_length=64, default="UTC")
    website = models.URLField(blank=True)
    location = models.CharField(max_length=128, blank=True)
    receive_product_updates = models.BooleanField(default=True)
    receive_marketing_emails = models.BooleanField(default=False)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Profile for {self.user_id}"


class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="preferences")
    default_temperature = models.FloatField(default=0.7)
    default_max_tokens = models.PositiveIntegerField(default=1000)
    enable_context_memory = models.BooleanField(default=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return f"Preferences for {self.user_id}"

