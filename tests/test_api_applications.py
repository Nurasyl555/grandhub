import pytest
from httpx import AsyncClient
from sqlmodel.ext.asyncio.session import AsyncSession

from app import app
from app.auth.dependencies import get_current_user
from app.auth.models import User
from app.schemes.grant import GrantCreate
from app.services.grantService import GrantService

grant_service = GrantService()


@pytest.fixture(autouse=True)
async def _clear_current_user_override():
    """_act_as() ниже пишет прямо в app.dependency_overrides — подчищаем
    за собой, чтобы это не протекло в тесты других файлов."""
    yield
    app.dependency_overrides.pop(get_current_user, None)


def _act_as(user: User) -> None:
    """
    user_client/other_user_client обе переопределяют одну и ту же глобальную
    app.dependency_overrides на общем httpx-клиенте — если использовать их
    вместе в одном тесте, второй override молча перекрывает первый ещё до
    начала теста. Для тестов, которым нужны две личности одновременно,
    переключаемся явно и последовательно на одном client.
    """
    app.dependency_overrides[get_current_user] = lambda: user


async def _make_grant(session: AsyncSession, **overrides) -> int:
    data = dict(
        title="API Test Grant",
        description="A grant for application API tests",
        source_url="https://example.com/api-app-grant",
        provider="Test Foundation",
    )
    data.update(overrides)
    grant = await grant_service.create_grant(GrantCreate(**data), session)
    return grant.id


async def test_list_requires_authentication(client: AsyncClient):
    response = await client.get("/api/v1/applications/")
    assert response.status_code in (401, 403)


async def test_create_requires_authentication(client: AsyncClient):
    response = await client.post(
        "/api/v1/applications/", json={"item_type": "grant", "item_id": 1}
    )
    assert response.status_code in (401, 403)


async def test_create_and_list_roundtrip(session: AsyncSession, user_client: AsyncClient):
    grant_id = await _make_grant(session)

    create_res = await user_client.post(
        "/api/v1/applications/", json={"item_type": "grant", "item_id": grant_id}
    )
    assert create_res.status_code == 201, create_res.text
    assert create_res.json()["status"] == "draft"

    list_res = await user_client.get("/api/v1/applications/")
    assert list_res.status_code == 200
    body = list_res.json()
    assert len(body["applications"]) == 1
    assert body["applications"][0]["data"]["title"] == "API Test Grant"


async def test_create_rejects_unknown_opportunity(user_client: AsyncClient):
    response = await user_client.post(
        "/api/v1/applications/", json={"item_type": "grant", "item_id": 999999}
    )
    assert response.status_code == 400


async def test_status_filter(session: AsyncSession, user_client: AsyncClient):
    grant_id = await _make_grant(session)
    await user_client.post(
        "/api/v1/applications/", json={"item_type": "grant", "item_id": grant_id, "status": "draft"}
    )
    await user_client.post(
        "/api/v1/applications/",
        json={"item_type": "grant", "item_id": grant_id, "status": "submitted"},
    )

    response = await user_client.get("/api/v1/applications/?status=submitted")

    apps = response.json()["applications"]
    assert len(apps) == 1
    assert apps[0]["status"] == "submitted"


async def test_patch_transitions_draft_to_submitted(session: AsyncSession, user_client: AsyncClient):
    grant_id = await _make_grant(session)
    created = (
        await user_client.post("/api/v1/applications/", json={"item_type": "grant", "item_id": grant_id})
    ).json()

    response = await user_client.patch(
        f"/api/v1/applications/{created['id']}", json={"status": "submitted"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "submitted"
    assert body["submitted_at"] is not None


async def test_delete_own_application(session: AsyncSession, user_client: AsyncClient):
    grant_id = await _make_grant(session)
    created = (
        await user_client.post("/api/v1/applications/", json={"item_type": "grant", "item_id": grant_id})
    ).json()

    response = await user_client.delete(f"/api/v1/applications/{created['id']}")
    assert response.status_code == 204

    list_res = await user_client.get("/api/v1/applications/")
    assert list_res.json()["applications"] == []


async def test_cannot_see_other_users_applications_in_list(
    session: AsyncSession, client: AsyncClient, regular_user: User, other_user: User
):
    grant_id = await _make_grant(session)

    _act_as(regular_user)
    await client.post("/api/v1/applications/", json={"item_type": "grant", "item_id": grant_id})

    _act_as(other_user)
    other_list = await client.get("/api/v1/applications/")

    assert other_list.json()["applications"] == []


async def test_cannot_patch_other_users_application(
    session: AsyncSession, client: AsyncClient, regular_user: User, other_user: User
):
    grant_id = await _make_grant(session)

    _act_as(regular_user)
    created = (
        await client.post("/api/v1/applications/", json={"item_type": "grant", "item_id": grant_id})
    ).json()

    _act_as(other_user)
    response = await client.patch(
        f"/api/v1/applications/{created['id']}", json={"note": "hijacked"}
    )
    assert response.status_code == 404

    _act_as(regular_user)
    mine = (await client.get("/api/v1/applications/")).json()["applications"][0]
    assert mine["note"] is None


async def test_cannot_delete_other_users_application(
    session: AsyncSession, client: AsyncClient, regular_user: User, other_user: User
):
    grant_id = await _make_grant(session)

    _act_as(regular_user)
    created = (
        await client.post("/api/v1/applications/", json={"item_type": "grant", "item_id": grant_id})
    ).json()

    _act_as(other_user)
    response = await client.delete(f"/api/v1/applications/{created['id']}")
    assert response.status_code == 404

    _act_as(regular_user)
    mine = (await client.get("/api/v1/applications/")).json()["applications"]
    assert len(mine) == 1
