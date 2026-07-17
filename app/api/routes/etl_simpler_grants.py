# app/api/routes/etl_simpler_grants.py
from __future__ import annotations
from fastapi import APIRouter, Query, status

from app.api.routes.etl_tasks import dispatch
from app.celery_tasks import etl_simpler_grants

router = APIRouter(prefix="/etl", tags=["etl"])


@router.post("/simpler-grants/run", status_code=status.HTTP_202_ACCEPTED)
async def run_simpler_grants(
    pages: int = Query(1, ge=1, le=25, description="Сколько страниц листинга обойти"),
    start_page: int = Query(1, ge=1, description="С какой страницы начинать (обычно 1)"),
    throttle_sec: float = Query(0.0, ge=0.0, le=5.0, description="Пауза между страницами (сек)"),
):
    """
    Ставит в очередь ETL из Simpler.Grants.gov (обход выдачи + карточек,
    сохранение через GrantService). Результат — по GET /etl/tasks/{task_id}.
    """
    return dispatch(
        etl_simpler_grants,
        pages=pages,
        start_page=start_page,
        throttle_sec=throttle_sec,
    )
