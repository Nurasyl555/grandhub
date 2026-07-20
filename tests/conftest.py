from __future__ import annotations

import uuid
from typing import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel
from sqlmodel.ext.asyncio.session import AsyncSession

# Импортируем модели, чтобы они зарегистрировались в SQLModel.metadata
# ДО вызова create_all — иначе их таблицы не будут созданы.
from app.models import grant, scholarship, internship, recommendation, application  # noqa: F401
from app.auth.models import User  # noqa: F401

from app import app
from app.db.main import get_session
from app.auth.dependencies import get_current_user


# in-memory SQLite, общая на весь тестовый прогон.
# StaticPool держит одно физическое соединение — без него каждое новое
# подключение к ":memory:" создавало бы отдельную пустую базу.
test_engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestSessionLocal = sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(autouse=True)
async def _prepare_database() -> AsyncIterator[None]:
    """Пересоздаёт схему перед каждым тестом — тесты не видят данные друг друга."""
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest_asyncio.fixture
async def session() -> AsyncIterator[AsyncSession]:
    """Сессия для unit-тестов сервисов — без HTTP-слоя."""
    async with TestSessionLocal() as s:
        yield s


async def _override_get_session() -> AsyncIterator[AsyncSession]:
    async with TestSessionLocal() as s:
        yield s


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """HTTP-клиент, говорящий с приложением напрямую через ASGI, без сокета."""
    app.dependency_overrides[get_session] = _override_get_session
    transport = ASGITransport(app=app)
    # base_url обязан быть localhost/127.0.0.1 — см. TrustedHostMiddleware
    # в app/middlewares/middleware.py, иначе запрос отклоняется с 400.
    async with AsyncClient(transport=transport, base_url="http://localhost") as c:
        yield c
    app.dependency_overrides.pop(get_session, None)


@pytest.fixture
def admin_user() -> User:
    return User(
        uid=uuid.uuid4(),
        username="admin",
        email="admin@test.com",
        first_name="Admin",
        last_name="User",
        role="admin",
        is_verified=True,
        password_hash="not-used",
    )


@pytest_asyncio.fixture
async def admin_client(client: AsyncClient, admin_user: User) -> AsyncIterator[AsyncClient]:
    """
    Клиент, авторизованный как admin.
    Подменяем get_current_user напрямую — так тест не зависит от реального
    Redis (блок-лист токенов) и не требует настоящего JWT.
    """
    app.dependency_overrides[get_current_user] = lambda: admin_user
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def regular_user() -> User:
    return User(
        uid=uuid.uuid4(),
        username="jane",
        email="jane@test.com",
        first_name="Jane",
        last_name="Doe",
        role="user",
        is_verified=True,
        password_hash="not-used",
        interests="machine learning research grants",
    )


@pytest_asyncio.fixture
async def user_client(client: AsyncClient, regular_user: User) -> AsyncIterator[AsyncClient]:
    """Клиент, авторизованный как обычный (не admin) пользователь."""
    app.dependency_overrides[get_current_user] = lambda: regular_user
    yield client
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def other_user() -> User:
    """Второй пользователь — для проверки изоляции между аккаунтами."""
    return User(
        uid=uuid.uuid4(),
        username="mallory",
        email="mallory@test.com",
        first_name="Mallory",
        last_name="Doe",
        role="user",
        is_verified=True,
        password_hash="not-used",
    )


@pytest_asyncio.fixture
async def other_user_client(client: AsyncClient, other_user: User) -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_current_user] = lambda: other_user
    yield client
    app.dependency_overrides.pop(get_current_user, None)
