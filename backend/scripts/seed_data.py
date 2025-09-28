#!/usr/bin/env python
"""Seed initial application data such as default AI models."""

import os
import sys

import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.development")
django.setup()

from apps.ai_integration.models import AIModel  # noqa: E402


def seed_models() -> None:
    defaults = [
        {
            "name": "gpt-3.5-turbo",
            "display_name": "GPT-3.5 Turbo",
            "provider": "openai",
            "openrouter_model_id": "openai/gpt-3.5-turbo",
            "supports_streaming": True,
            "supports_function_calling": True,
            "supports_vision": False,
            "max_context_length": 16384,
            "max_output_tokens": 4096,
            "input_price_per_million": 1.50,
            "output_price_per_million": 2.00,
        },
        {
            "name": "gpt-4",
            "display_name": "GPT-4",
            "provider": "openai",
            "openrouter_model_id": "openai/gpt-4",
            "supports_streaming": True,
            "supports_function_calling": True,
            "supports_vision": False,
            "max_context_length": 32768,
            "max_output_tokens": 8192,
            "input_price_per_million": 30.0,
            "output_price_per_million": 60.0,
        },
    ]

    for entry in defaults:
        _, created = AIModel.objects.update_or_create(
            name=entry["name"],
            defaults=entry,
        )
        action = "Created" if created else "Updated"
        print(f"{action} model {entry['name']}")


if __name__ == "__main__":
    seed_models()

