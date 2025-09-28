import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

import httpx
import jwt
import requests
from asgiref.sync import sync_to_async
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from google_auth_oauthlib.flow import Flow

from .models import User, UserSession

logger = logging.getLogger(__name__)


class GoogleOAuthError(Exception):
    pass


class InvalidTokenError(Exception):
    pass


class GoogleOAuthService:
    USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"
    DEFAULT_SCOPES = [
        "openid",
        "https://www.googleapis.com/auth/userinfo.email",
        "https://www.googleapis.com/auth/userinfo.profile",
    ]

    @classmethod
    def _build_flow(cls, redirect_uri: str) -> Flow:
        """Build Google OAuth flow using project settings."""
        client_id = getattr(settings, "GOOGLE_CLIENT_ID", None)
        client_secret = getattr(settings, "GOOGLE_CLIENT_SECRET", None)

        if not client_id or not client_secret:
            raise ImproperlyConfigured("Google OAuth credentials are not configured")

        client_config: Dict[str, Any] = {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [redirect_uri],
            }
        }

        return Flow.from_client_config(
            client_config,
            scopes=cls.DEFAULT_SCOPES,
            redirect_uri=redirect_uri,
        )

    @classmethod
    def _fetch_google_user(cls, access_token: str) -> Dict[str, Any]:
        """Fetch user profile information from Google."""
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            response = requests.get(cls.USERINFO_URL, headers=headers, timeout=10)
        except requests.RequestException as exc:
            logger.error(f"Request to Google userinfo failed: {exc}")
            raise GoogleOAuthError("Unable to fetch Google user profile") from exc

        if response.status_code != 200:
            logger.error(f"Google userinfo request failed: {response.text}")
            raise GoogleOAuthError("Unable to fetch Google user profile")

        return response.json()

    @classmethod
    async def exchange_code_for_user_data(cls, code: str, redirect_uri: str) -> dict[str, Any]:
        """Exchange authorization code for user data using Google OAuth flow."""
        try:
            # Build flow and exchange code for credentials
            flow = cls._build_flow(redirect_uri)
            flow.fetch_token(code=code)
            credentials = flow.credentials

            # Fetch user profile
            google_profile = cls._fetch_google_user(credentials.token)

            return {
                "email": google_profile.get("email"),
                "first_name": google_profile.get("given_name", ""),
                "last_name": google_profile.get("family_name", ""),
                "display_name": google_profile.get("name", ""),
                "avatar_url": google_profile.get("picture"),
                "google_id": google_profile.get("id") or google_profile.get("sub"),
                "email_verified": google_profile.get("verified_email", False),
            }

        except Exception as exc:
            logger.error(f"OAuth code exchange failed: {exc}")
            raise GoogleOAuthError(f"Failed to exchange code for user data: {exc}") from exc

    @classmethod
    async def create_or_update_user(cls, google_user_data: dict[str, Any]):
        defaults = {
            "first_name": google_user_data.get("first_name", ""),
            "last_name": google_user_data.get("last_name", ""),
            "display_name": google_user_data.get("display_name", ""),
            "avatar_url": google_user_data.get("avatar_url"),
            "google_id": google_user_data.get("google_id"),
            "email_verified": google_user_data.get("email_verified", False),
        }

        def _get_or_create():
            user, created = User.objects.get_or_create(
                email=google_user_data["email"], defaults=defaults
            )
            if not created:
                for field, value in defaults.items():
                    setattr(user, field, value)
                user.save(update_fields=list(defaults.keys()))
            return user, created

        return await sync_to_async(_get_or_create, thread_sensitive=True)()


class JWTService:
    @staticmethod
    def _base_payload(user: User, session_id: uuid.UUID | None = None) -> dict[str, Any]:
        now = datetime.now(timezone.utc)
        payload = {
            "user_id": str(user.id),
            "email": user.email,
            "iss": settings.JWT_ISSUER,
            "iat": int(now.timestamp()),
        }
        if session_id:
            payload["session_id"] = str(session_id)
        return payload

    @classmethod
    def generate_tokens(cls, user: User, session_id: uuid.UUID | None = None) -> dict[str, str]:
        if session_id is None:
            session_id = uuid.uuid4()
        access_payload = cls._base_payload(user, session_id=session_id)
        refresh_payload = cls._base_payload(user, session_id=session_id)

        now = datetime.now(timezone.utc)
        access_payload["exp"] = int(
            (now + settings.JWT_ACCESS_TOKEN_LIFETIME).timestamp()
        )
        refresh_payload["exp"] = int(
            (now + settings.JWT_REFRESH_TOKEN_LIFETIME).timestamp()
        )
        refresh_payload["type"] = "refresh"

        access_token = jwt.encode(
            access_payload,
            settings.SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        refresh_token = jwt.encode(
            refresh_payload,
            settings.SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        return {"access": access_token, "refresh": refresh_token, "session_id": session_id}

    @staticmethod
    def decode_token(token: str) -> dict[str, Any]:
        try:
            return jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                issuer=settings.JWT_ISSUER,
            )
        except jwt.PyJWTError as exc:  # type: ignore[attr-defined]
            raise InvalidTokenError(str(exc)) from exc

    @classmethod
    def decode_refresh_token(cls, token: str) -> dict[str, Any]:
        payload = cls.decode_token(token)
        if payload.get("type") != "refresh":
            raise InvalidTokenError("Invalid refresh token")
        return payload


class UserSessionService:
    @staticmethod
    async def create_session(
        *,
        user: User,
        ip_address: str | None,
        user_agent: str | None,
        device_info: dict[str, Any] | None = None,
    ) -> UserSession:
        expires_at = datetime.now(timezone.utc) + settings.JWT_REFRESH_TOKEN_LIFETIME

        def _create():
            return UserSession.objects.create(
                user=user,
                ip_address=ip_address or "0.0.0.0",
                user_agent=user_agent or "unknown",
                device_info=device_info or {},
                expires_at=expires_at,
            )

        return await sync_to_async(_create, thread_sensitive=True)()

    @staticmethod
    async def touch_session(session: UserSession) -> None:
        def _save():
            session.last_activity = datetime.now(timezone.utc)
            session.save(update_fields=["last_activity"])

        await sync_to_async(_save, thread_sensitive=True)()

    @staticmethod
    async def invalidate_session(session_id: uuid.UUID) -> None:
        def _invalidate():
            UserSession.objects.filter(session_id=session_id).update(is_active=False)

        await sync_to_async(_invalidate, thread_sensitive=True)()


