#!/usr/bin/env python
"""Utility script to run Django migrations inside the Docker environment."""

import os
import subprocess
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANAGE = os.path.join(BASE_DIR, "manage.py")


def main() -> int:
    env = os.environ.copy()
    env.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.development")
    result = subprocess.run([sys.executable, MANAGE, "migrate"], env=env)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
