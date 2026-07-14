from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from app.db.main import get_session
from app.parsers.internship.usajobs import fetch_internships_from_usajobs

router = APIRouter(prefix="/etl", tags=["etl"])


@router.post("/usajobs-internships/run")
async def run_usajobs_internships(
    keyword: str | None = Query(None, description="Например: 'student', 'intern'"),
    location_name: str | None = Query(None, description="Например: 'Washington, DC'"),
    results_per_page: int = Query(100, ge=1, le=500),
    max_pages: int = Query(1, ge=1, le=20),
    throttle_sec: float = Query(0.5, ge=0.0, le=5.0),
    session: AsyncSession = Depends(get_session),
):
    """
    ETL из официального USAJOBS Search API (не скрапинг):
    https://developer.usajobs.gov/api-reference/get-api-search
    Требует USAJOBS_API_KEY и USAJOBS_USER_AGENT в .env.
    """
    try:
        ids = await fetch_internships_from_usajobs(
            session=session,
            keyword=keyword,
            location_name=location_name,
            results_per_page=results_per_page,
            max_pages=max_pages,
            throttle_sec=throttle_sec,
        )
        return {
            "source": "usajobs.gov",
            "keyword": keyword,
            "location_name": location_name,
            "inserted": len(ids),
            "ids": ids,
        }
    except RuntimeError as e:
        return JSONResponse(status_code=400, content={"error": "ConfigurationError", "message": str(e)})
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": e.__class__.__name__, "message": str(e)})
