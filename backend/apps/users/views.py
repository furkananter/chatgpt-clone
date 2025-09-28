from ninja import Router
from ninja.errors import HttpError

from apps.authentication.models import User
from apps.authentication.views import AuthBearer
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


@users_router.get("/profile")
async def get_profile(request):
    return {"message": "User profile endpoint - temporarily disabled for setup"}


@users_router.put("/profile")
async def update_profile_view(request):
    return {"message": "Update profile endpoint - temporarily disabled for setup"}


@users_router.get("/preferences")
async def get_preferences(request):
    return {"message": "User preferences endpoint - temporarily disabled for setup"}


@users_router.put("/preferences")
async def update_preferences_view(request):
    return {"message": "Update preferences endpoint - temporarily disabled for setup"}


@users_router.get("/summary")
async def user_summary(request):
    return {"message": "User summary endpoint - temporarily disabled for setup"}

