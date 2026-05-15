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
app = celery_app

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
    # Heavy tasks (compress/convert/PDF compress) are CPU-bound and can run for
    # tens of seconds. Without prefetch=1 the heavy worker would reserve up to
    # four jobs at once, making the UI feel stuck while jobs sit unprocessed.
    worker_prefetch_multiplier=1,
    # Re-deliver crashed tasks rather than silently dropping them.
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    # Avoid leaking job results forever; they live in Redis for one day.
    result_expires=86_400,
    task_queues=(
        Queue("fast", fast_exchange, routing_key="fast"),
        Queue("heavy", heavy_exchange, routing_key="heavy"),
    ),
    task_routes={
        # Long-running / CPU-heavy tasks go to the dedicated "heavy" queue.
        "app.workers.pdf_tasks.compress_pdf_task": {"queue": "heavy"},
        "app.workers.pdf_tasks.ocr_pdf_task": {"queue": "heavy"},
        "app.workers.pdf_tasks.office_to_pdf_task": {"queue": "heavy"},
        "app.workers.convert_tasks.convert_file_task": {"queue": "heavy"},
        "app.workers.compress_tasks.compress_file_task": {"queue": "heavy"},
        "app.workers.image_tasks.batch_resize_task": {"queue": "heavy"},
        "app.workers.image_tasks.ocr_image_task": {"queue": "heavy"},
        # Everything else stays on the fast queue.
        "app.workers.pdf_tasks.*": {"queue": "fast"},
        "app.workers.image_tasks.*": {"queue": "fast"},
        "app.workers.convert_tasks.*": {"queue": "fast"},
    },
    task_annotations={
        # Compression / conversion: bounded CPU time per spec.
        "app.workers.compress_tasks.compress_file_task": {"time_limit": 240, "soft_time_limit": 210},
        "app.workers.pdf_tasks.compress_pdf_task": {"time_limit": 300, "soft_time_limit": 270},
        "app.workers.convert_tasks.convert_file_task": {"time_limit": 300, "soft_time_limit": 240},
        # Office conversion is the slowest happy path; LibreOffice can take ~3
        # minutes on a complex deck.
        "app.workers.pdf_tasks.office_to_pdf_task": {"time_limit": 300, "soft_time_limit": 270},
        # OCR can take many minutes on long PDFs.
        "app.workers.pdf_tasks.ocr_pdf_task": {"time_limit": 900, "soft_time_limit": 600},
        "app.workers.image_tasks.ocr_image_task": {"time_limit": 600, "soft_time_limit": 480},
        # PDF merge/split/rotate: per spec, soft 180s / hard 240s.
        "app.workers.pdf_tasks.merge_pdfs_task": {"time_limit": 240, "soft_time_limit": 180},
        "app.workers.pdf_tasks.split_pdf_task": {"time_limit": 240, "soft_time_limit": 180},
        "app.workers.pdf_tasks.rotate_pdf_task": {"time_limit": 240, "soft_time_limit": 180},
        "app.workers.pdf_tasks.watermark_pdf_task": {"time_limit": 240, "soft_time_limit": 180},
        "app.workers.image_tasks.batch_resize_task": {"time_limit": 300, "soft_time_limit": 270},
        # Default fallbacks for any other tasks on each queue.
        "app.workers.pdf_tasks.*": {"time_limit": 180, "soft_time_limit": 150},
        "app.workers.image_tasks.*": {"time_limit": 180, "soft_time_limit": 150},
    },
    # Conservative global cap.
    task_time_limit=900,
    task_soft_time_limit=600,
    result_backend=settings.REDIS_URL,
)

import app.workers.pdf_tasks  # noqa: E402,F401
import app.workers.image_tasks  # noqa: E402,F401
import app.workers.compress_tasks  # noqa: E402,F401
import app.workers.convert_tasks  # noqa: E402,F401
