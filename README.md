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
SECRET_KEY=localdev
secret_key=localdev

JWT_SECRET=localdev
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
