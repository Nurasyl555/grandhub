from pathlib import Path

import sentry_sdk
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes.routes import router as base_router
from contextlib import asynccontextmanager
from app.core.config import settings
from app.core.logger import setup_logging
from app.db.main import init_db
from app.auth.routes import auth_router
from app.middlewares.middleware import register_middleware

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,
    )


@asynccontextmanager
async def life_span(app: FastAPI):
    print("server is starting ... ")
    await init_db()
    yield
    print("server has been stopped")


version = "v1"

setup_logging()

app = FastAPI(
    title="GrantHub.AI",
    description="A REST API for a opportunities review web service",
    version=version,
    docs_url=f"/api/{version}/docs",
    redoc_url=f"/api/{version}/redoc"
)

register_middleware(app)

app.include_router(base_router, prefix=f"/api/{version}")
app.include_router(auth_router, prefix=f"/api/{version}/auth", tags=['Auth'])


# Раздача собранного React-фронтенда (granthub_front-main/dist).
# В dev-режиме папки нет — фронт поднимается отдельно через `npm run dev`,
# поэтому блок молча пропускается.
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = (BASE_DIR / "granthub_front-main" / "dist").resolve()

if FRONTEND_DIR.is_dir():
    assets_dir = FRONTEND_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{catchall:path}", include_in_schema=False)
    async def serve_react_app(catchall: str):
        if catchall.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")

        # resolve() + is_relative_to не дают выйти за пределы dist/
        # через "../" в запрошенном пути.
        requested = (FRONTEND_DIR / catchall).resolve()
        if requested.is_relative_to(FRONTEND_DIR) and requested.is_file():
            return FileResponse(requested)

        # SPA: любой неизвестный путь отдаём index.html — роутинг на клиенте
        return FileResponse(FRONTEND_DIR / "index.html")
