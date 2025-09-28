from django.contrib import admin
from django.http import JsonResponse
from django.urls import path

from ninja import NinjaAPI

from apps.authentication.views import auth_router
from apps.chats.views import chat_router
from apps.users.views import users_router

api = NinjaAPI(
    version="1.0.0",
    title="ChatGPT Clone API",
    description="Backend API for ChatGPT Clone",
)

api.add_router("/auth", auth_router)
api.add_router("/chats", chat_router)
api.add_router("/users", users_router)


def health_view(request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", api.urls),
    path("health/", health_view, name="health"),
]
