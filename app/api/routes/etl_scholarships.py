# app/api/routes/etl_scholarships.py
from fastapi import APIRouter, Query, status

from app.api.routes.etl_tasks import dispatch
from app.celery_tasks import etl_intl_scholarships

router = APIRouter(prefix="/etl", tags=["etl"])


@router.post("/intl-scholarships/run", status_code=status.HTTP_202_ACCEPTED)
async def run_intl_scholarships(
    details: int = Query(128, description="AwardSearch[details] (страна/национальность)"),
    limit: int = Query(10, ge=1, le=500, description="Сколько карточек всего забрать (max_items)"),
    pages: int = Query(1, ge=1, le=25, description="Сколько страниц листинга обойти (max_pages)"),
    per_page: int = Query(40, ge=5, le=1000, description="Сколько рядов на странице листинга (per-page)"),
    dry_run: bool = Query(False, description="Не писать в БД, только скачать/распарсить"),
    skip_past_years: bool = Query(True, description="Пропускать карточки с годом < текущего"),
):
    """
    Ставит в очередь ETL со internationalscholarships.com.
    Результат (в т.ч. при dry_run) — по GET /etl/tasks/{task_id}.
    """
    return dispatch(
        etl_intl_scholarships,
        details=details,
        max_items=limit,
        max_pages=pages,
        per_page=per_page,
        dry_run=dry_run,
        skip_past_years=skip_past_years,
    )
