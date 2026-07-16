# ---------- Stage 1: Frontend build ----------
FROM node:20-slim AS frontend-builder

WORKDIR /frontend

COPY granthub_front-main/package.json granthub_front-main/package-lock.json ./
RUN npm ci

COPY granthub_front-main/ ./
RUN npm run build

# ---------- Stage 2: Python deps ----------
FROM python:3.11-slim AS builder

WORKDIR /app

# build-essential, а не голый gcc: psycopg2 собирается из исходников и без
# libc6-dev падает на "fatal error: stdlib.h: No such file or directory".
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---------- Stage 3: Runtime ----------
FROM python:3.11-slim

WORKDIR /app

# libpq5 — рантайм-зависимость psycopg2 (libpq-dev нужен только для сборки).
# Без неё psycopg2 упадёт на import, если проект переключат на Postgres.
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 1000 appuser

COPY --from=builder /install /usr/local

COPY --chown=appuser:appuser . .

# Собранный React кладём туда, где его ищет app/__init__.py
COPY --from=frontend-builder --chown=appuser:appuser /frontend/dist ./granthub_front-main/dist

# /app создан WORKDIR-ом под root, поэтому appuser не смог бы ни создать
# logs/ (его делает app/core/logger.py при импорте), ни файл SQLite.
RUN mkdir -p logs data \
    && chmod +x docker-entrypoint.sh \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
