from ninja import ModelSchema, Schema

from .models import UserPreference, UserProfile


class UserProfileSchema(ModelSchema):
    class Meta:
        model = UserProfile
        fields = ["bio", "timezone", "website", "location", "receive_product_updates", "receive_marketing_emails"]


class UserPreferenceSchema(ModelSchema):
    class Meta:
        model = UserPreference
        fields = ["default_temperature", "default_max_tokens", "enable_context_memory"]


class UserProfileUpdateRequest(Schema):
    bio: str | None = None
    timezone: str | None = None
    website: str | None = None
    location: str | None = None
    receive_product_updates: bool | None = None
    receive_marketing_emails: bool | None = None


class UserPreferenceUpdateRequest(Schema):
    default_temperature: float | None = None
    default_max_tokens: int | None = None
    enable_context_memory: bool | None = None


class UserSummarySchema(Schema):
    total_chats: int
    total_messages: int
    subscription_tier: str
    monthly_message_limit: int

