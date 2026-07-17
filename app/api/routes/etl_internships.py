from __future__ import annotations
from fastapi import APIRouter, HTTPException, Query, status

from app.api.routes.etl_tasks import dispatch
from app.celery_tasks import etl_usajobs_internships
from app.core.config import settings

router = APIRouter(prefix="/etl", tags=["etl"])


@router.post("/usajobs-internships/run", status_code=status.HTTP_202_ACCEPTED)
async def run_usajobs_internships(
    keyword: str | None = Query(None, description="Например: 'student', 'intern'"),
    location_name: str | None = Query(None, description="Например: 'Washington, DC'"),
    results_per_page: int = Query(100, ge=1, le=500),
    max_pages: int = Query(1, ge=1, le=20),
    throttle_sec: float = Query(0.5, ge=0.0, le=5.0),
):
    """
    Ставит в очередь ETL из официального USAJOBS Search API (не скрапинг):
    https://developer.usajobs.gov/api-reference/get-api-search
    Требует USAJOBS_API_KEY и USAJOBS_USER_AGENT в .env.
    Результат — по GET /etl/tasks/{task_id}.
    """
    # Проверяем конфиг до постановки в очередь: иначе клиент получил бы 202,
    # а задача упала бы в воркере — ошибку пришлось бы искать в логах.
    if not settings.USAJOBS_API_KEY or not settings.USAJOBS_USER_AGENT:
        raise HTTPException(
            status_code=400,
            detail=(
                "USAJOBS_API_KEY / USAJOBS_USER_AGENT не заданы в .env. "
                "Бесплатный ключ: https://developer.usajobs.gov/APIRequest/Index"
            ),
        )

    return dispatch(
        etl_usajobs_internships,
        keyword=keyword,
        location_name=location_name,
        results_per_page=results_per_page,
        max_pages=max_pages,
        throttle_sec=throttle_sec,
    )
