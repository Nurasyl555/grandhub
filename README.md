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

Manually triggered — there is no scheduler wired up yet.

| Method | Endpoint                              | Source                          |
|--------|----------------------------------------|----------------------------------|
| POST   | `/etl/simpler-grants/run`              | simpler.grants.gov (scraping)     |
| POST   | `/etl/intl-scholarships/run`           | internationalscholarships.com (scraping) |
| POST   | `/etl/usajobs-internships/run`         | USAJOBS Search API (official, requires `USAJOBS_API_KEY`) |
