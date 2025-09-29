from ninja import Router
from ninja.errors import HttpError

from apps.authentication.models import User
from apps.authentication.views import auth_bearer_instance
from .schemas import (
    UserPreferenceSchema,
    UserPreferenceUpdateRequest,
    UserProfileSchema,
    UserProfileUpdateRequest,
    UserSummarySchema,
)
from .services import (
    get_or_create_preferences,
    get_or_create_profile,
    update_preferences,
    update_profile,
)

users_router = Router(tags=["Users"])


@users_router.get("/profile", response=UserProfileSchema, auth=auth_bearer_instance)
async def get_profile(request):
    """Get user profile information."""
    user = request.auth
    profile = await get_or_create_profile(user)
    return UserProfileSchema.from_orm(profile)


@users_router.put("/profile", response=UserProfileSchema, auth=auth_bearer_instance)
async def update_profile_view(request, data: UserProfileUpdateRequest):
    """Update user profile information."""
    user = request.auth
    profile = await update_profile(user, data.dict(exclude_unset=True))
    return UserProfileSchema.from_orm(profile)


@users_router.get("/preferences", response=UserPreferenceSchema, auth=auth_bearer_instance)
async def get_preferences(request):
    """Get user preferences."""
    user = request.auth
    preferences = await get_or_create_preferences(user)
    return UserPreferenceSchema.from_orm(preferences)


@users_router.put("/preferences", response=UserPreferenceSchema, auth=auth_bearer_instance)
async def update_preferences_view(request, data: UserPreferenceUpdateRequest):
    """Update user preferences."""
    user = request.auth
    preferences = await update_preferences(user, data.dict(exclude_unset=True))
    return UserPreferenceSchema.from_orm(preferences)


@users_router.get("/summary", response=UserSummarySchema, auth=auth_bearer_instance)
async def user_summary(request):
    """Get user summary statistics."""
    user = request.auth

    from apps.chats.models import Chat
    from asgiref.sync import sync_to_async

    def _get_stats():
        total_chats = Chat.objects.filter(user=user).count()
        total_messages = user.monthly_message_count
        return {
            "total_chats": total_chats,
            "total_messages": total_messages,
            "subscription_tier": user.subscription_tier,
            "monthly_message_limit": user.monthly_message_limit,
        }

    stats = await sync_to_async(_get_stats, thread_sensitive=True)()
    return UserSummarySchema(**stats)

