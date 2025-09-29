import os
import ssl
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

import dj_database_url
import environ


BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from preferred locations (backend first)
ENV_PATHS = [BASE_DIR / ".env", BASE_DIR.parent / ".env"]
for env_path in ENV_PATHS:
    if env_path.exists():
        environ.Env.read_env(str(env_path))

env = environ.Env(
    DEBUG=(bool, False),
    DATABASE_URL=(str),
    REDIS_URL=(str, "redis://127.0.0.1:6379/0"),
    SITE_URL=(str, "http://localhost:3000"),
)


SECRET_KEY = env("DJANGO_SECRET_KEY", default="unsafe-secret-key")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS", default=["http://localhost", "http://127.0.0.1"]
)

SITE_URL = env("SITE_URL")

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "corsheaders",
    "channels",
    "rest_framework",
]

LOCAL_APPS = [
    "apps.authentication",
    "apps.users",
    "apps.chats",
    "apps.ai_integration",
    "shared",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "shared.middleware.RateLimitMiddleware",
]

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

ROOT_URLCONF = "core.urls"
WSGI_APPLICATION = "core.wsgi.application"
ASGI_APPLICATION = "core.asgi.application"


DATABASES = {"default": dj_database_url.parse(env("DATABASE_URL"), conn_max_age=600)}


AUTH_USER_MODEL = "authentication.User"
AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]


REDIS_URL = env("REDIS_URL")
REDIS_PARSED = urlparse(REDIS_URL)
REDIS_SSL_OPTIONS = None
if REDIS_PARSED.scheme == "rediss":
    REDIS_SSL_OPTIONS = {
        "ssl_cert_reqs": ssl.CERT_REQUIRED,
        "ssl_check_hostname": True,
        "ssl_ca_certs": None,
    }


def _redis_options(*, include_serializer: bool = False) -> dict:
    options: dict[str, object] = {
        "CLIENT_CLASS": "django_redis.client.DefaultClient",
    }
    if include_serializer:
        options["SERIALIZER"] = "django_redis.serializers.json.JSONSerializer"
    if REDIS_SSL_OPTIONS:
        options["CONNECTION_POOL_KWARGS"] = REDIS_SSL_OPTIONS
    return options


CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": _redis_options(include_serializer=True),
    },
    "sessions": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": _redis_options(),
    },
    "rate_limiting": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": _redis_options(),
    },
}

SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "sessions"
SESSION_COOKIE_AGE = 60 * 60 * 24


LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [env("CHANNEL_REDIS_URL", default=REDIS_URL)],
        },
    }
}
CHANNEL_REDIS_PARSED = urlparse(CHANNEL_LAYERS["default"]["CONFIG"]["hosts"][0])
if CHANNEL_REDIS_PARSED.scheme == "rediss":
    CHANNEL_LAYERS["default"]["CONFIG"]["ssl"] = {
        "cert_reqs": ssl.CERT_REQUIRED,
        "check_hostname": True,
        "ca_certs": None,
    }


CORS_ALLOW_ALL_ORIGINS = env.bool("CORS_ALLOW_ALL_ORIGINS", default=True)
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[SITE_URL])
CORS_ALLOW_CREDENTIALS = True


OPENROUTER_API_KEY = env("OPENROUTER_API_KEY", default="")
OPENAI_API_KEY = env("OPENAI_API_KEY", default="")


# Google OAuth Settings
GOOGLE_CLIENT_ID = env("GOOGLE_CLIENT_ID", default="")
GOOGLE_CLIENT_SECRET = env("GOOGLE_CLIENT_SECRET", default="")


JWT_ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)
JWT_REFRESH_TOKEN_LIFETIME = timedelta(days=7)
JWT_ALGORITHM = "HS256"
JWT_ISSUER = env("JWT_ISSUER", default="chatgpt-clone")


EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"


LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(levelname)s %(asctime)s %(name)s %(message)s",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        }
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}


PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
        "rest_framework.authentication.BasicAuthentication",
    ],
}


HEALTH_CHECKS = {
    "database": "django.db",
    "redis": "django.core.cache",
}
