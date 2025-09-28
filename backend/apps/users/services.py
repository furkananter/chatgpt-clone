from __future__ import annotations

from asgiref.sync import sync_to_async

from apps.authentication.models import User

from .models import UserPreference, UserProfile


async def get_or_create_profile(user: User) -> UserProfile:
    async def _get_or_create():
        profile, _ = UserProfile.objects.get_or_create(user=user)
        return profile

    return await sync_to_async(_get_or_create, thread_sensitive=True)()


async def update_profile(user: User, payload: dict) -> UserProfile:
    profile = await get_or_create_profile(user)

    async def _update():
        for field, value in payload.items():
            setattr(profile, field, value)
        profile.save(update_fields=list(payload.keys()))
        return profile

    return await sync_to_async(_update, thread_sensitive=True)()


async def get_or_create_preferences(user: User) -> UserPreference:
    async def _get_or_create():
        preferences, _ = UserPreference.objects.get_or_create(user=user)
        return preferences

    return await sync_to_async(_get_or_create, thread_sensitive=True)()


async def update_preferences(user: User, payload: dict) -> UserPreference:
    preferences = await get_or_create_preferences(user)

    async def _update():
        for field, value in payload.items():
            setattr(preferences, field, value)
        preferences.save(update_fields=list(payload.keys()))
        return preferences

    return await sync_to_async(_update, thread_sensitive=True)()

