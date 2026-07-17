from __future__ import annotations

from celery.result import AsyncResult
from fastapi import APIRouter, HTTPException
from kombu.exceptions import OperationalError

from app.celery_tasks import celery_app

router = APIRouter(prefix="/etl", tags=["etl"])


_BROKER_UNAVAILABLE = (
    "Celery broker недоступен — запущен ли Redis? "
    "Локально: docker compose up redis, либо весь стек через docker compose up."
)


def dispatch(task, **kwargs) -> dict:
    """
    Ставит ETL в очередь и сразу возвращает управление.

    Раньше парсеры выполнялись прямо в обработчике запроса: обход сайта на
    десятки страниц держал воркер uvicorn и ронял сервер. Теперь работу
    забирает Celery, а клиент следит за ней через GET /etl/tasks/{task_id}.
    """
    # Явная проверка с коротким таймаутом. Без неё .delay() на мёртвом Redis
    # уходит в ретраи kombu поверх ретраев redis-py и висит десятками секунд —
    # то самое блокирование обработчика, ради ухода от которого всё и затевалось.
    try:
        connection = celery_app.connection_for_write()
        connection.ensure_connection(max_retries=0, timeout=3)
        connection.release()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"{_BROKER_UNAVAILABLE} ({e})") from e

    try:
        async_result = task.delay(**kwargs)
    except OperationalError as e:
        raise HTTPException(status_code=503, detail=f"{_BROKER_UNAVAILABLE} ({e})") from e

    return {"task_id": async_result.id, "status": "queued"}


@router.get("/tasks/{task_id}")
async def get_etl_task_status(task_id: str):
    """
    Статус ETL-задачи: PENDING / STARTED / RETRY / SUCCESS / FAILURE.

    PENDING означает и «в очереди», и «такого id нет» — Celery не различает
    эти случаи, если задача ещё не попадала к воркеру.
    """
    result = AsyncResult(task_id, app=celery_app)

    payload: dict = {"task_id": task_id, "state": result.state}
    if result.successful():
        payload["result"] = result.result
    elif result.failed():
        payload["error"] = str(result.result)

    return payload
