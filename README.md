# GrantHub AI

A web platform for discovering grants, internships, and scholarships — built with FastAPI, SQLModel.

## Stack

- **FastAPI** — web framework
- **SQLModel + Alembic** — database ORM and migrations
- **Celery + Redis** — background task queue (email, ETL)
- **Upstash Redis** — caching and sessions
- **Uvicorn** — ASGI server

## Requirements

- Python 3.11 (3.12+ not recommended — some dependencies are incompatible)
- pip

No Docker required for local development.

## Local Setup

### 1. Create and activate a virtual environment

```bash
python -m venv .venv
```

```bash
# macOS / Linux
source .venv/bin/activate

# Windows
.venv\Scripts\activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
pip install aiosqlite asgiref
```

### 3. Create a `.env` file

Create a `.env` file in the project root with the following values:

```env
DATABASE_URL=sqlite+aiosqlite:///./dev.db
SECRET_KEY=your-secret-key
secret_key=your-secret

JWT_SECRET=your-jwt-secret
JWT_ALGORITHM=HS256

CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

MAIL_USERNAME=test@test.com
MAIL_PASSWORD=dummy
MAIL_FROM=test@test.com
MAIL_FROM_NAME=Local
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com

UPSTASH_REDIS_REST_URL=http://localhost
UPSTASH_REDIS_REST_TOKEN=dummy

DOMAIN=localhost:8000

# Comma-separated. In production replace with your real frontend domains.
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
ALLOWED_HOSTS=localhost,127.0.0.1

# Optional — only needed for the USAJOBS internship ETL.
# Free key: https://developer.usajobs.gov/APIRequest/Index
USAJOBS_API_KEY=
USAJOBS_USER_AGENT=your-email@example.com
```

> For production, replace all dummy values with real credentials.

### 4. Run database migrations

```bash
alembic upgrade head
```

### 5. Start the development server

```bash
uvicorn app:app --reload
```

The app will be available at **http://127.0.0.1:8000**

In dev the React frontend runs separately:

```bash
cd granthub_front-main
npm install
npm run dev          # http://localhost:5173
```

## Running with Docker

Needs only a `.env` file (see step 3) — Python, Node and Redis all come from images.

```bash
docker compose up --build
```

This starts three services and applies migrations automatically:

| Service          | Port | Description                                        |
|------------------|------|----------------------------------------------------|
| `granthub-app`   | 8000 | FastAPI + the React build served from the same port |
| `granthub-redis` | 6379 | Celery broker / result backend                      |
| `granthub-worker`| —    | Celery worker                                       |

Everything is on **http://127.0.0.1:8000** — the React app at `/`, the API under `/api/v1`.
Unlike dev mode there is no separate port 5173: the frontend is built inside the image
(`Dockerfile`, stage `frontend-builder`) and served by FastAPI as static files.

Logs are written to `./logs/app.log` on the host. The database lives in the named
volume `granthub-data` — it survives restarts and does **not** touch your local `dev.db`.

Notes:
- `docker compose down -v` also wipes the database volume.
- `/api/v1/health` reports `redis: error` in Compose. That is expected: the token
  blocklist talks to Upstash over HTTP REST, and the Compose Redis speaks the plain
  Redis protocol (it serves Celery only). Point `UPSTASH_REDIS_REST_URL` at a real
  Upstash instance to make that check green.

## Running tests

Tests use an isolated in-memory SQLite database — they never touch `dev.db`.

```bash
pip install pytest pytest-asyncio
pytest -v
```

## API Reference

Base URL: `http://127.0.0.1:8000/api/v1`

### Health

| Method | Endpoint   | Description                |
|--------|------------|----------------------------|
| GET    | `/health`  | Database and Redis health check |

### Auth

| Method | Endpoint                                    | Description                |
|--------|---------------------------------------------|----------------------------|
| POST   | `/auth/signup`                              | Register a new user        |
| POST   | `/auth/login`                               | Login (returns JWT tokens) |
| GET    | `/auth/refresh_token`                       | Refresh access token       |
| GET    | `/auth/logout`                              | Logout (revoke token)      |
| GET    | `/auth/verify/{token}`                      | Verify email address       |
| POST   | `/auth/password-reset-request`              | Request password reset     |
| POST   | `/auth/password-reset-confirm/{token}`      | Confirm password reset     |
| GET    | `/auth/my_account`                          | Get current user info      |
| PATCH  | `/auth/my_account`                          | Update `interests` (used by the recommendation engine) |

### Grants

| Method | Endpoint           | Description                                |
|--------|--------------------|--------------------------------------------|
| GET    | `/grants/`         | List grants (paginated, searchable)        |
| POST   | `/grants/`         | Create a grant (admin)                     |
| GET    | `/grants/{id}`     | Get grant details                          |
| PATCH  | `/grants/{id}`     | Update a grant (admin)                     |
| DELETE | `/grants/{id}`     | Delete a grant (admin)                     |

### Scholarships

| Method | Endpoint                | Description                                    |
|--------|-------------------------|------------------------------------------------|
| GET    | `/scholarships/`        | List scholarships (paginated, searchable)      |
| POST   | `/scholarships/`        | Create a scholarship (admin)                   |
| GET    | `/scholarships/{id}`    | Get scholarship details                        |
| PATCH  | `/scholarships/{id}`    | Update a scholarship (admin)                   |
| DELETE | `/scholarships/{id}`    | Delete a scholarship (admin)                   |

### Internships

| Method | Endpoint               | Description                                   |
|--------|------------------------|-----------------------------------------------|
| GET    | `/internships/`        | List internships (paginated, searchable)      |
| POST   | `/internships/`        | Create an internship (admin)                  |
| GET    | `/internships/{id}`    | Get internship details                        |
| PATCH  | `/internships/{id}`    | Update an internship (admin)                  |
| DELETE | `/internships/{id}`    | Delete an internship (admin)                  |

### Recommendations

| Method | Endpoint                    | Description                         |
|--------|-----------------------------|-------------------------------------|
| GET    | `/recommendations/`         | Get personalized recommendations    |
| POST   | `/recommendations/`         | Bulk-create recommendations (admin) |
| POST   | `/recommendations/recompute`| Recompute the current user's ML recommendations (self-service, requires a verified account) |
| DELETE | `/recommendations/{id}`     | Delete a recommendation (admin)     |

**How recomputation works:** the engine is content-based — it TF-IDF-vectorizes each grant/scholarship/internship's `title + description` and the user's `interests` text (set via `PATCH /auth/my_account`), then ranks items by cosine similarity per opportunity type. Results are stored in `recommendations` with `source_model="tfidf_v1"`; each call replaces that user's previous ML recommendations. Implementation: [app/ml/recommender.py](app/ml/recommender.py), [app/services/recommendationService.py](app/services/recommendationService.py).

### Query Parameters for List Endpoints

| Parameter      | Type   | Description                                    |
|----------------|--------|------------------------------------------------|
| `page`         | int    | Page number (default: 1)                       |
| `page_size`    | int    | Items per page (default: 20, max: 100)         |
| `q`            | str    | Search by title / description                  |
| `provider`     | str    | Filter by provider                             |
| `country`      | str    | Filter by country                              |
| `deadline_from`| str    | Deadline after (YYYY-MM-DD)                    |
| `deadline_to`  | str    | Deadline before (YYYY-MM-DD)                   |
| `sort_by`      | str    | Sort field: `created_at`, `published_at`, `deadline` |
| `order`        | str    | Sort direction: `asc` or `desc`                |

**Additional filters:**
- Scholarships: `level` (bachelor, master, phd)
- Internships: `paid` (true/false)

### Pagination Headers

List endpoints return pagination info in response headers:
- `X-Total-Count` — total number of items
- `X-Page` — current page number
- `X-Page-Size` — current page size

### ETL (data import)

ETL runs as **Celery tasks**, not inside the request — crawling dozens of pages
used to block the uvicorn worker and could take the whole server down. These
endpoints return **202 Accepted** with a `task_id`; poll it for the result.

| Method | Endpoint                              | Source                          |
|--------|----------------------------------------|----------------------------------|
| POST   | `/etl/simpler-grants/run`              | simpler.grants.gov (scraping)     |
| POST   | `/etl/intl-scholarships/run`           | internationalscholarships.com (scraping) |
| POST   | `/etl/usajobs-internships/run`         | USAJOBS Search API (official, requires `USAJOBS_API_KEY`) |
| GET    | `/etl/tasks/{task_id}`                 | Task state: `PENDING` / `STARTED` / `RETRY` / `SUCCESS` / `FAILURE` |

```bash
# queue it
curl -X POST "http://127.0.0.1:8000/api/v1/etl/usajobs-internships/run?keyword=student&max_pages=3"
# -> {"task_id":"a1b2c3...","status":"queued"}

# check on it
curl "http://127.0.0.1:8000/api/v1/etl/tasks/a1b2c3..."
# -> {"state":"SUCCESS","result":{"source":"usajobs.gov","inserted":40,...}}
```

Re-running is safe: every importer de-duplicates on `(title, source_url)`.

**Requires Redis and a running worker.** With `docker compose up` both are there.
Running `uvicorn` on its own is not enough — these endpoints answer `503` if the
broker is unreachable. To work on ETL locally without the full stack:

```bash
docker compose up -d redis
celery -A app.celery_tasks:celery_app worker --loglevel=info --pool=solo   # --pool=solo for Windows
```

### Scheduled jobs (Celery Beat)

`app/celery_tasks.py` defines a nightly schedule: refresh grants (03:00),
scholarships (03:30), internships (04:00), then recompute every user's ML
recommendations (05:00), all in `Asia/Almaty`.

Beat is a **separate process** and is not part of `docker compose` yet — without
it the schedule never fires and ETL stays manual:

```bash
celery -A app.celery_tasks:celery_app beat --loglevel=info
```
