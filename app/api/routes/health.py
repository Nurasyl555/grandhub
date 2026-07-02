from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlmodel import select

from app.db.main import AsyncSessionLocal
from app.db.redis import token_blocklist

router = APIRouter()


@router.get("/health")
async def health_check():
    checks = {"db": "ok", "redis": "ok"}

    try:
        async with AsyncSessionLocal() as session:
            await session.exec(select(1))
    except Exception as e:
        checks["db"] = f"error: {e}"

    try:
        await token_blocklist.ping()
    except Exception as e:
        checks["redis"] = f"error: {e}"

    healthy = all(v == "ok" for v in checks.values())
    return JSONResponse(content=checks, status_code=200 if healthy else 503)
