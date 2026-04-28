from celery import Celery
from kombu import Exchange, Queue

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "pdftool",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.workers.pdf_tasks",
        "app.workers.image_tasks",
        "app.workers.convert_tasks",
        "app.workers.compress_tasks",
    ],
)
celery_app.autodiscover_tasks(
    [
        "app.workers.pdf_tasks",
        "app.workers.image_tasks",
        "app.workers.convert_tasks",
        "app.workers.compress_tasks",
    ]
)

fast_exchange = Exchange("fast", type="direct")
heavy_exchange = Exchange("heavy", type="direct")

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_default_queue="fast",
    task_default_exchange="fast",
    task_default_routing_key="fast",
    task_queues=(
        Queue("fast", fast_exchange, routing_key="fast"),
        Queue("heavy", heavy_exchange, routing_key="heavy"),
    ),
    task_routes={
        "app.workers.pdf_tasks.compress_pdf_task": {"queue": "heavy"},
        "app.workers.convert_tasks.convert_file_task": {"queue": "heavy"},
        "app.workers.compress_tasks.compress_file_task": {"queue": "heavy"},
        "app.workers.pdf_tasks.office_to_pdf_task": {"queue": "heavy"},
        "app.workers.image_tasks.batch_resize_task": {"queue": "heavy"},
        "app.workers.pdf_tasks.*": {"queue": "fast"},
        "app.workers.image_tasks.*": {"queue": "fast"},
        "app.workers.convert_tasks.*": {"queue": "fast"},
    },
    task_annotations={
        "app.workers.pdf_tasks.compress_pdf_task": {"time_limit": 300, "soft_time_limit": 290},
        "app.workers.convert_tasks.convert_file_task": {"time_limit": 300, "soft_time_limit": 290},
        "app.workers.compress_tasks.compress_file_task": {"time_limit": 600, "soft_time_limit": 590},
        "app.workers.pdf_tasks.office_to_pdf_task": {"time_limit": 300, "soft_time_limit": 290},
        "app.workers.image_tasks.batch_resize_task": {"time_limit": 300, "soft_time_limit": 290},
        "app.workers.pdf_tasks.*": {"time_limit": 60, "soft_time_limit": 55},
        "app.workers.image_tasks.*": {"time_limit": 60, "soft_time_limit": 55},
    },
    task_time_limit=60,
    task_soft_time_limit=55,
    result_backend=settings.REDIS_URL,
)

import app.workers.compress_tasks  # noqa: E402,F401
import app.workers.convert_tasks  # noqa: E402,F401
import app.workers.image_tasks  # noqa: E402,F401
import app.workers.pdf_tasks  # noqa: E402,F401
