import json
import logging
from datetime import datetime
from uuid import UUID

from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError
from ninja.security import HttpBearer

from .models import User, UserSession
from .schemas import (
    AuthResponse,
    GoogleAuthorizeResponse,
    GoogleOAuthRequest,
    TokenRefreshRequest,
    UserProfileResponse,
)
from .services import (
    GoogleOAuthError,
    GoogleOAuthService,
    InvalidTokenError,
    JWTService,
    UserSessionService,
)
from .utils import get_client_ip, get_user_agent


logger = logging.getLogger(__name__)

# Custom JSON encoder to handle datetime and UUID objects
class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, UUID):
            return str(obj)
        return super().default(obj)

auth_router = Router(tags=["Authentication"])


class AuthBearer(HttpBearer):
    async def __call__(self, request):
        token = None

        auth_header = request.headers.get(self.header)
        if auth_header and auth_header.lower().startswith(f"{self.openapi_scheme} "):
            token = auth_header.split(" ", 1)[1].strip()

        if not token:
            token = request.COOKIES.get('chatgpt_auth')

        if not token:
            cookie_header = request.META.get('HTTP_COOKIE', '')
            if 'chatgpt_auth=' in cookie_header:
                for cookie_part in cookie_header.split(';'):
                    if 'chatgpt_auth=' in cookie_part.strip():
                        token = cookie_part.split('=', 1)[1].strip()
                        break

        if not token:
            raise HttpError(401, "No authentication token provided")

        return await self.authenticate(request, token)

    async def authenticate(self, request, token=None):
        try:
            payload = JWTService.decode_token(token)
            user_id = payload["user_id"]

            user = await User.objects.aget(id=user_id)
            return user

        except InvalidTokenError as exc:
            logger.warning("Invalid token provided")
            raise HttpError(401, "Invalid token")
        except User.DoesNotExist:
            logger.warning(f"Token valid but user {user_id} not found")
            raise HttpError(401, "User not found")
        except Exception as exc:
            logger.error(f"Authentication error: {exc}")
            raise HttpError(401, "Authentication failed")


@auth_router.post("/google/oauth", response=AuthResponse)
async def google_oauth(request, data: GoogleOAuthRequest):
    try:
        logger.info(f"Google OAuth request received - redirect_uri: {data.redirect_uri}")

        google_user_data = await GoogleOAuthService.exchange_code_for_user_data(
            code=data.code, redirect_uri=data.redirect_uri
        )
        logger.info(f"Google user data received: {google_user_data['email']}")

        user, created = await GoogleOAuthService.create_or_update_user(google_user_data)
        logger.info(f"User {'created' if created else 'updated'}: {user.email} (ID: {user.id})")

        session = await UserSessionService.create_session(
            user=user,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )
        logger.info(f"Session created: {session.session_id}")

        tokens = JWTService.generate_tokens(user, session.session_id)
        logger.info(f"JWT tokens generated for user: {user.email}")

        auth_data = {
            "access_token": tokens["access"],
            "refresh_token": tokens["refresh"],
            "user": UserProfileResponse.from_orm(user).dict(),
            "expires_in": settings.JWT_ACCESS_TOKEN_LIFETIME.total_seconds(),
        }

        # Create JSON response with cookies using custom encoder for UUID handling
        response_obj = HttpResponse(json.dumps(auth_data, cls=DateTimeEncoder), content_type='application/json')
        response_obj.set_cookie(
            'chatgpt_auth',
            tokens["access"],
            max_age=int(settings.JWT_ACCESS_TOKEN_LIFETIME.total_seconds()),
            httponly=True,
            secure=not settings.DEBUG,  # HTTPS in production
            samesite='Lax'
        )
        response_obj.set_cookie(
            'chatgpt_refresh',
            tokens["refresh"],
            max_age=60*60*24*7,  # 7 days
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Lax'
        )
        return response_obj
    except GoogleOAuthError as exc:
        logger.error(f"OAuth validation failed: {exc}")
        raise HttpError(400, f"OAuth validation failed: {exc}")
    except Exception as exc:  # pragma: no cover - unexpected failures
        logger.exception("OAuth processing failed")
        raise HttpError(500, "Authentication failed") from exc


@auth_router.post("/refresh")
async def refresh_token(request, data: TokenRefreshRequest = None):
    try:
        # Try to get refresh token from cookie first, then fallback to request body
        refresh_token = request.COOKIES.get('chatgpt_refresh')
        if not refresh_token and data:
            refresh_token = data.refresh_token

        if not refresh_token:
            logger.warning("Refresh token missing; non-auth cookies available: %s", [key for key in request.COOKIES.keys() if not key.startswith('chatgpt_')])
            raise HttpError(401, "No refresh token provided")

        payload = JWTService.decode_refresh_token(refresh_token)
        user = await User.objects.aget(id=payload["user_id"])

        try:
            session = await UserSession.objects.aget(
                user=user,
                session_id=payload["session_id"],
                is_active=True,
                expires_at__gt=timezone.now(),
            )
        except UserSession.DoesNotExist as exc:
            logger.warning(
                "Refresh session not found or inactive; user=%s session=%s",
                user.id,
                payload.get("session_id"),
            )
            raise HttpError(401, "Invalid refresh token") from exc

        tokens = JWTService.generate_tokens(user, session.session_id)

        auth_data = {
            "access_token": tokens["access"],
            "refresh_token": tokens["refresh"],
            "user": UserProfileResponse.from_orm(user).dict(),
            "expires_in": settings.JWT_ACCESS_TOKEN_LIFETIME.total_seconds(),
        }

        # Create JSON response with cookies for refresh endpoint too
        response_obj = HttpResponse(json.dumps(auth_data, cls=DateTimeEncoder), content_type='application/json')
        response_obj.set_cookie(
            'chatgpt_auth',
            tokens["access"],
            max_age=int(settings.JWT_ACCESS_TOKEN_LIFETIME.total_seconds()),
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Lax'
        )
        response_obj.set_cookie(
            'chatgpt_refresh',
            tokens["refresh"],
            max_age=60*60*24*7,  # 7 days
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Lax'
        )
        return response_obj
    except (InvalidTokenError, UserSession.DoesNotExist):
        logger.warning(
            "Refresh failed; non-auth cookies available: %s", [key for key in request.COOKIES.keys() if not key.startswith('chatgpt_')]
        )
        raise HttpError(401, "Invalid refresh token")


@auth_router.post("/logout")
async def logout(request):
    """Expire auth cookies and deactivate the session if we can."""

    response_payload = json.dumps({"message": "Successfully logged out"})
    response = HttpResponse(response_payload, content_type="application/json")

    # Expire cookies on the client
    response.delete_cookie("chatgpt_auth", samesite="Lax")
    response.delete_cookie("chatgpt_refresh", samesite="Lax")

    # Best-effort session invalidation using either cookie
    token = request.COOKIES.get("chatgpt_refresh") or request.COOKIES.get("chatgpt_auth")
    if token:
        try:
            payload = JWTService.decode_token(token)
            session_id = payload.get("session_id")
            if session_id:
                await UserSessionService.invalidate_session(UUID(session_id))
        except InvalidTokenError:
            logger.info("Logout called with invalid token")
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning(f"Failed to invalidate session during logout: {exc}")

    return response


def _get_frontend_origin() -> str:
    """Get frontend origin from settings."""
    return getattr(settings, "SITE_URL", "http://localhost:3000")


def _success_response(tokens: dict, user: User) -> HttpResponse:
    """Return an HTML page that communicates auth success to the opener."""

    payload = {
        "type": "AUTH_SUCCESS",
        "payload": {
            "access_token": tokens["access"],
            "refresh_token": tokens["refresh"],
            "user": {
                "id": str(user.id),
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "subscription_tier": user.subscription_tier,
            },
        },
    }

    target_origin = json.dumps(_get_frontend_origin())

    payload_json = json.dumps(payload, cls=DateTimeEncoder)

    html = f"""<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Authentication Successful</title>
  </head>
  <body>
    <script>
      const payload = {payload_json};
      const targetOrigin = {target_origin};
      if (window.opener && !window.opener.closed) {{
        window.opener.postMessage(payload, targetOrigin);
      }}
      window.close();
    </script>
    <p>Authentication completed. You can close this window.</p>
  </body>
</html>"""

    return HttpResponse(html)


def _error_response(message: str) -> HttpResponse:
    """Return an HTML page that notifies the opener about an auth error."""

    payload = {
        "type": "AUTH_ERROR",
        "error": message,
    }

    target_origin = json.dumps(_get_frontend_origin())
    payload_json = json.dumps(payload)

    html = f"""<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Authentication Failed</title>
  </head>
  <body>
    <script>
      const payload = {payload_json};
      const targetOrigin = {target_origin};
      if (window.opener && !window.opener.closed) {{
        window.opener.postMessage(payload, targetOrigin);
      }}
      window.close();
    </script>
    <p>Authentication failed. You can close this window.</p>
  </body>
</html>"""

    return HttpResponse(html, status=400)


@auth_router.get("/google/authorize", response=GoogleAuthorizeResponse)
async def google_authorize(request):
    """Initiate the Google OAuth flow and return the authorization URL."""

    redirect_uri = "http://localhost:8000/api/v1/auth/google/callback"
    flow = GoogleOAuthService._build_flow(redirect_uri)

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    request.session["google_auth_state"] = state
    request.session.modified = True

    return {"authorization_url": authorization_url}


@auth_router.get("/google/callback")
async def google_oauth_callback(request):
    """Handle Google's OAuth callback and finalize authentication."""
    code = request.GET.get("code")
    state = request.GET.get("state")
    error = request.GET.get("error")

    if error:
        logger.error(f"Google OAuth error: {error}")
        return _error_response(error)

    if not code or not state:
        logger.error("Missing authorization code or state")
        return _error_response("Missing authorization code or state")

    # Check state parameter for security
    # Note: Temporarily disabled for popup flow - state validation in popup scenarios can be tricky
    # stored_state = request.session.pop("google_auth_state", None)
    # if not stored_state or stored_state != state:
    #     logger.error("Invalid state parameter")
    #     return _error_response("Invalid state parameter")

    try:
        # Process the OAuth code and get user data
        google_user_data = await GoogleOAuthService.exchange_code_for_user_data(
            code=code, redirect_uri="http://localhost:8000/api/v1/auth/google/callback"
        )
        user, created = await GoogleOAuthService.create_or_update_user(google_user_data)

        session = await UserSessionService.create_session(
            user=user,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
        )

        tokens = JWTService.generate_tokens(user, session.session_id)

        # Redirect to frontend with tokens in URL params AND set cookies
        frontend_url = _get_frontend_origin()
        redirect_url = f"{frontend_url}/auth/callback?token={tokens['access']}&refresh_token={tokens['refresh']}&user_id={user.id}"

        response = HttpResponseRedirect(redirect_url)
        response.set_cookie(
            'chatgpt_auth',
            tokens["access"],
            max_age=int(settings.JWT_ACCESS_TOKEN_LIFETIME.total_seconds()),
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Lax'
        )
        response.set_cookie(
            'chatgpt_refresh',
            tokens["refresh"],
            max_age=60*60*24*7,  # 7 days
            httponly=True,
            secure=not settings.DEBUG,
            samesite='Lax'
        )
        return response

    except Exception as exc:
        logger.exception("OAuth callback processing failed")
        return _error_response("Authentication failed")


# Create a global instance of AuthBearer for reuse
auth_bearer_instance = AuthBearer()

@auth_router.get("/me", response=UserProfileResponse, auth=auth_bearer_instance)
async def get_current_user(request):
    """Get current authenticated user"""
    logger.info(f"/me endpoint accessed - method: {request.method}")
    logger.debug(f"Available cookies: {[key for key in request.COOKIES.keys() if not key.startswith('chatgpt_')]}")

    user = request.auth
    logger.info(f"Authenticated user request: {user.email} (ID: {user.id})")
    return UserProfileResponse.from_orm(user)
