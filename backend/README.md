# ChatGPT Clone Backend

Production-ready Django backend supporting a ChatGPT-like application with Google OAuth, JWT authentication, conversation management, AI integration through OpenRouter, Mem0-based memory, and Qdrant vector storage.

## Features
- Django Ninja API with async-ready endpoints
- Google OAuth 2.0 authentication with JWT session tokens
- Redis-backed caching, sessions, and rate limiting
- Celery workers for AI response generation, memory updates, and embeddings
- OpenRouter integration for multi-provider LLM access
- Mem0 conversational memory + Qdrant semantic search
- Docker Compose stack for PostgreSQL, Redis, Qdrant, web, Celery, and Nginx

## Getting Started

### 1. Environment
```bash
cp .env.example .env
```
Fill secrets for Google OAuth, OpenRouter, and Qdrant.

### 2. Install Dependencies
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements/development.txt
```

### 3. Database & Migrations
```bash
python manage.py migrate
python scripts/seed_data.py
```

### 4. Run Services
```bash
python manage.py runserver
celery -A core worker -l info
celery -A core beat -l info
```

### 5. Docker
```bash
cd docker
docker compose up --build
```

## Testing
```bash
pytest
```

## Project Structure
Refer to the `chatgpt_backend` directory tree for modules, apps, shared utilities, and infrastructure files described in the project brief.

