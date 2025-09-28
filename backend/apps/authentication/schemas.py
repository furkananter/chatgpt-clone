from datetime import datetime
from typing import Optional

from ninja import ModelSchema, Schema

from .models import User


class GoogleOAuthRequest(Schema):
    code: str
    redirect_uri: str


class GoogleAuthorizeResponse(Schema):
    authorization_url: str


class LoginRequest(Schema):
    email: str
    password: str


class TokenRefreshRequest(Schema):
    refresh_token: str


class UserProfileResponse(ModelSchema):
    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "avatar_url",
            "subscription_tier",
            "monthly_message_count",
            "monthly_message_limit",
            "preferred_language",
            "preferred_model",
            "theme_preference",
            "created_at",
            "updated_at",
            "last_login_at",
        ]


class AuthResponse(Schema):
    access_token: str
    refresh_token: str
    user: UserProfileResponse
    expires_in: float


class SessionResponse(Schema):
    session_id: str
    expires_at: datetime
    is_active: bool
    last_activity: datetime


class LogoutResponse(Schema):
    message: str

