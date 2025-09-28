from __future__ import annotations

from django.http import HttpRequest


def get_client_ip(request: HttpRequest) -> str:
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "0.0.0.0")


def get_user_agent(request: HttpRequest) -> str:
    return request.META.get("HTTP_USER_AGENT", "unknown")

