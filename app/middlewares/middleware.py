from fastapi import FastAPI
from fastapi.requests import Request
from fastapi.middleware.cors import CORSMiddleware

import time
import logging
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from loguru import logger as loguru_logger

from app.core.config import settings

# Свой access-лог ниже, штатный uvicorn-овский глушим, чтобы не дублировать
logging.getLogger('uvicorn.access').disabled = True


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


def register_middleware(app: FastAPI):

    @app.middleware('http')
    async def custom_logging(request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        processing_time = time.time() - start_time

        # Через loguru, а не print(): иначе настроенный в app/core/logger.py
        # файловый sink (logs/app.log) остаётся пустым.
        loguru_logger.info(
            "{method} {path} -> {status} ({duration:.3f}s)",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration=processing_time,
        )
        return response

    # Конкретные origins вместо "*": с allow_credentials=True браузер всё
    # равно отвергает "*", а в проде это дыра. Домены задаются через
    # ALLOWED_ORIGINS в .env.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_split_csv(settings.ALLOWED_ORIGINS),
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=_split_csv(settings.ALLOWED_HOSTS),
    )
