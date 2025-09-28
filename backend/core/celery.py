import os
import logging

from celery import Celery
from celery.signals import task_postrun, task_prerun

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.development")

app = Celery("chatgpt_backend")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()

app.conf.task_routes = {
    "apps.chats.tasks.generate_ai_response": {"queue": "ai_processing"},
    "apps.chats.tasks.process_message_attachments": {"queue": "file_processing"},
    "apps.vector_store.tasks.create_embeddings": {"queue": "embeddings"},
    "apps.ai_integration.tasks.update_memory": {"queue": "memory"},
}

app.conf.task_annotations = {
    "apps.chats.tasks.generate_ai_response": {
        "rate_limit": "10/m",
    },
    "apps.vector_store.tasks.create_embeddings": {
        "rate_limit": "20/m",
    },
}

logger = logging.getLogger(__name__)


@task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
    logger.info("Starting task %s with ID %s", getattr(task, "name", sender), task_id)


@task_postrun.connect
def task_postrun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, retval=None, state=None, **kwds):
    logger.info(
        "Task %s with ID %s completed with state %s",
        getattr(task, "name", sender),
        task_id,
        state,
    )


__all__ = ("app",)

