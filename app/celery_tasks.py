from __future__ import annotations

import asyncio
import ssl
from typing import Awaitable, Callable, Optional, TypeVar

from celery import Celery
from celery.schedules import crontab
from celery.signals import after_setup_logger
from celery.utils.log import get_task_logger

from asgiref.sync import async_to_sync
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.middlewares.mail import mail, create_message

from app.core.logger import setup_logging

# ВАЖНО: для ETL нам нужен AsyncSession напрямую, без FastAPI Depends
from app.db.main import AsyncSessionLocal, async_engine

logger = get_task_logger(__name__)

T = TypeVar("T")

celery_app = Celery(
    "granthub",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
)

_REDIS_SOCKET_OPTS = {
    "socket_connect_timeout": 2,
    "socket_timeout": 2,
    "retry_on_timeout": False,
}

# Базовая конфигурация Celery
celery_app.conf.update(
    timezone="Asia/Almaty",
    enable_utc=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    worker_max_tasks_per_child=100,
    task_acks_late=True, # безопаснее при падениях
    broker_connection_retry_on_startup=True,
    # Ограничиваем попытки достучаться до брокера. По умолчанию
    # broker_connection_max_retries=None — это бесконечные ретраи, из-за
    # которых .delay() в API-обработчике висит вместо честной ошибки, если
    # Redis не поднят.
    broker_connection_max_retries=2,
    # Таймауты нужны обоим транспортам: у брокера и у result backend свои
    # соединения, и backend с настройками по умолчанию висел на mget, даже
    # когда брокер уже сдавался.
    broker_transport_options=_REDIS_SOCKET_OPTS,
    result_backend_transport_options=_REDIS_SOCKET_OPTS,
    task_publish_retry_policy={
        "max_retries": 1,
        "interval_start": 0,
        "interval_step": 0.2,
        "interval_max": 0.5,
    },
)

# SSL для Redis — только если нужен
if settings.CELERY_BROKER_URL.startswith("rediss://"):
    celery_app.conf.broker_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}
    celery_app.conf.redis_backend_use_ssl = {"ssl_cert_reqs": ssl.CERT_NONE}

# Ночное обновление каталога и пересчёт рекомендаций.
# Нужен отдельный процесс: celery -A app.celery_tasks:celery_app beat
celery_app.conf.beat_schedule = {
    "refresh-grants": {
        "task": "app.celery_tasks.etl_simpler_grants",
        "schedule": crontab(hour=3, minute=0),
        "kwargs": {"pages": 3, "throttle_sec": 1.0},
    },
    "refresh-scholarships": {
        "task": "app.celery_tasks.etl_intl_scholarships",
        "schedule": crontab(hour=3, minute=30),
        "kwargs": {"max_items": 100, "max_pages": 3},
    },
    "refresh-internships": {
        "task": "app.celery_tasks.etl_usajobs_internships",
        "schedule": crontab(hour=4, minute=0),
        "kwargs": {"keyword": "student", "max_pages": 3},
    },
    # После обновления каталога — пересчёт, иначе рекомендации ссылались бы
    # только на вчерашние записи.
    "recompute-recommendations": {
        "task": "app.celery_tasks.recompute_all_recommendations",
        "schedule": crontab(hour=5, minute=0),
    },
}


@after_setup_logger.connect
def setup_celery_logger(**kwargs):
    setup_logging()
    logger.info("Celery worker logging is handled by loguru")


def _run_async(coro_factory: Callable[[AsyncSession], Awaitable[T]]) -> T:
    """
    Выполняет асинхронный ETL внутри синхронной Celery-задачи.

    dispose() в finally обязателен: asyncio.run() заводит новый event loop на
    каждую задачу, а пул соединений живёт в модуле и переживает её. Без сброса
    пула следующая задача достала бы соединение, привязанное к уже закрытому
    loop'у, и упала на "attached to a different loop".
    """
    async def runner() -> T:
        try:
            async with AsyncSessionLocal() as session:
                return await coro_factory(session)
        finally:
            await async_engine.dispose()

    return asyncio.run(runner())


# EMAIL

@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 5},
    time_limit=30, # жёсткий таймаут задачи
)
def send_email(self, recipients: list[str], subject: str, html_message: str):
    """
    Отправка email через существующий mail middleware.
    """
    try:
        message = create_message(
            recipients=recipients,
            subject=subject,
            body=html_message,
        )
        # mail.send_message — async → исполняем синхронно в Celery
        async_to_sync(mail.send_message)(message)
        logger.info("Email sent to %s", recipients)
        return {"ok": True}
    except Exception as e:
        logger.exception("Email sending failed: %s", e)
        raise


# ETL
#
# Парсеры ходят в интернет и обходят десятки страниц. Раньше это выполнялось
# прямо в HTTP-обработчике и блокировало uvicorn на всё время обхода — вплоть
# до падения сервера. Retry безопасен: все create_* дедуплицируют по
# (title, source_url), повторный проход не плодит дубли.

_ETL_TASK_OPTS = dict(
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    soft_time_limit=600,
    time_limit=660,
)


@celery_app.task(name="app.celery_tasks.etl_simpler_grants", **_ETL_TASK_OPTS)
def etl_simpler_grants(pages: int = 1, start_page: int = 1, throttle_sec: float = 0.0):
    from app.parsers.grant.simpler_grants import fetch_grants_from_simpler

    ids = _run_async(
        lambda session: fetch_grants_from_simpler(
            session=session, pages=pages, start_page=start_page, throttle_sec=throttle_sec
        )
    )
    logger.info("simpler-grants ETL finished: %s grants", len(ids))
    return {"source": "simpler.grants.gov", "inserted": len(ids), "ids": ids}


@celery_app.task(name="app.celery_tasks.etl_intl_scholarships", **_ETL_TASK_OPTS)
def etl_intl_scholarships(
    details: int = 128,
    max_items: int = 10,
    max_pages: int = 1,
    per_page: int = 40,
    dry_run: bool = False,
    skip_past_years: bool = True,
):
    from app.parsers.scholarship.internationalscholarships import (
        fetch_scholarships_from_internationalscholarships,
    )

    result = _run_async(
        lambda session: fetch_scholarships_from_internationalscholarships(
            session=session,
            details=details,
            max_items=max_items,
            max_pages=max_pages,
            per_page=per_page,
            dry_run=dry_run,
            skip_past_years=skip_past_years,
        )
    )
    logger.info("intl-scholarships ETL finished: %s items", len(result))
    if dry_run:
        return {"dry_run": True, "count": len(result), "items": result}
    return {"source": "internationalscholarships.com", "inserted": len(result), "ids": result}


@celery_app.task(name="app.celery_tasks.etl_usajobs_internships", **_ETL_TASK_OPTS)
def etl_usajobs_internships(
    keyword: Optional[str] = None,
    location_name: Optional[str] = None,
    results_per_page: int = 100,
    max_pages: int = 1,
    throttle_sec: float = 0.5,
):
    from app.parsers.internship.usajobs import fetch_internships_from_usajobs

    ids = _run_async(
        lambda session: fetch_internships_from_usajobs(
            session=session,
            keyword=keyword,
            location_name=location_name,
            results_per_page=results_per_page,
            max_pages=max_pages,
            throttle_sec=throttle_sec,
        )
    )
    logger.info("usajobs-internships ETL finished: %s internships", len(ids))
    return {"source": "usajobs.gov", "inserted": len(ids), "ids": ids}


@celery_app.task(name="app.celery_tasks.recompute_all_recommendations", soft_time_limit=900, time_limit=960)
def recompute_all_recommendations():
    """
    Пересчитывает ML-рекомендации всем, у кого заполнены интересы.
    Пользователей без интересов пропускаем: TF-IDF там всё равно вернёт пусто.
    """
    from app.auth.models import User
    from app.services.recommendationService import RecommendationService

    async def run(session: AsyncSession):
        users = (
            await session.exec(
                select(User).where(User.interests.is_not(None), User.interests != "")
            )
        ).all()

        service = RecommendationService()
        total = 0
        for user in users:
            try:
                recs = await service.recompute_for_user(user, session)
                total += len(recs)
            except Exception:
                # Один сломанный профиль не должен рушить пересчёт остальным
                logger.exception("Recompute failed for user %s", user.uid)

        return {"users": len(users), "recommendations": total}

    result = _run_async(run)
    logger.info("Recommendations recomputed: %s", result)
    return result
