import uuid

from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app import app
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.schemes.grant import GrantCreate
from app.services.grantService import GrantService

grant_service = GrantService()


async def _create_grant(session: AsyncSession, **overrides) -> None:
    payload = dict(
        title="AI Research Grant",
        description="Funding for machine learning and artificial intelligence research",
        source_url="https://example.com/ai-grant",
        provider="NSF",
    )
    payload.update(overrides)
    await grant_service.create_grant(GrantCreate(**payload), session)


async def test_recompute_requires_authentication(client: AsyncClient):
    response = await client.post("/api/v1/recommendations/recompute")
    assert response.status_code in (401, 403)


async def test_recompute_returns_relevant_recommendation(
    session: AsyncSession, user_client: AsyncClient
):
    await _create_grant(session, title="AI Grant", source_url="https://example.com/a")
    await _create_grant(
        session,
        title="Gardening Grant",
        description="Funding for community gardens and urban farming",
        source_url="https://example.com/b",
    )

    # regular_user fixture has interests="machine learning research grants"
    response = await user_client.post("/api/v1/recommendations/recompute")

    assert response.status_code == 200
    body = response.json()
    assert len(body) >= 1
    assert body[0]["item_type"] == "grant"
    assert body[0]["source_model"] == "tfidf_v1"


async def test_recompute_replaces_previous_recommendations(
    session: AsyncSession, user_client: AsyncClient
):
    await _create_grant(session, source_url="https://example.com/a")

    first = await user_client.post("/api/v1/recommendations/recompute")
    second = await user_client.post("/api/v1/recommendations/recompute")

    assert first.status_code == 200
    assert second.status_code == 200
    # Повторный recompute не должен накапливать дубликаты
    assert len(second.json()) == len(first.json())


async def test_recompute_with_no_interests_returns_empty(session: AsyncSession, client: AsyncClient):
    await _create_grant(session)

    no_interest_user = User(
        uid=uuid.uuid4(),
        username="noone",
        email="noone@test.com",
        first_name="No",
        last_name="Interests",
        role="user",
        is_verified=True,
        password_hash="not-used",
        interests=None,
    )
    app.dependency_overrides[get_current_user] = lambda: no_interest_user
    try:
        response = await client.post("/api/v1/recommendations/recompute")
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    assert response.status_code == 200
    assert response.json() == []


async def test_update_my_account_sets_interests(user_client: AsyncClient):
    response = await user_client.patch(
        "/api/v1/auth/my_account", json={"interests": "climate science"}
    )

    assert response.status_code == 200
    assert response.json()["interests"] == "climate science"
