from .base import *  # noqa

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Allow specific origins for development
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False


EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

INSTALLED_APPS += ["django_extensions"]  # type: ignore[name-defined]

SHELL_PLUS = "ipython"
