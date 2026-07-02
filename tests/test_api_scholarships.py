from httpx import AsyncClient


async def _create_scholarship(admin_client: AsyncClient, **overrides) -> dict:
    payload = dict(
        title="Oxford Master Scholarship",
        description="Full tuition coverage",
        source_url="https://example.com/oxford",
        provider="Oxford",
        country="UK",
        level="master",
    )
    payload.update(overrides)
    response = await admin_client.post("/api/v1/scholarships/", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


async def test_create_scholarship_requires_admin(client: AsyncClient):
    """
    POST защищён RoleChecker(['admin']). Без авторизации (fixture `client`,
    не `admin_client`) FastAPI должен отклонить запрос ещё до вызова сервиса.
    """
    response = await client.post(
        "/api/v1/scholarships/",
        json={
            "title": "X",
            "description": "Y",
            "source_url": "https://example.com/x",
            "provider": "Z",
        },
    )
    assert response.status_code in (401, 403)


async def test_list_scholarships_pagination_headers(admin_client: AsyncClient):
    await _create_scholarship(admin_client, source_url="https://example.com/a")
    await _create_scholarship(admin_client, title="MIT Bachelor", source_url="https://example.com/b")

    response = await admin_client.get("/api/v1/scholarships/?page=1&page_size=1")

    assert response.status_code == 200
    assert response.headers["x-total-count"] == "2"
    assert response.headers["x-page"] == "1"
    assert response.headers["x-page-size"] == "1"
    assert len(response.json()) == 1


async def test_list_scholarships_filter_by_level(admin_client: AsyncClient):
    await _create_scholarship(admin_client, level="bachelor", source_url="https://example.com/a")
    await _create_scholarship(admin_client, level="phd", source_url="https://example.com/b")

    response = await admin_client.get("/api/v1/scholarships/?level=phd")

    body = response.json()
    assert len(body) == 1
    assert body[0]["level"] == "phd"


async def test_get_scholarship_not_found(client: AsyncClient):
    response = await client.get("/api/v1/scholarships/999")
    assert response.status_code == 404


async def test_delete_scholarship(admin_client: AsyncClient):
    created = await _create_scholarship(admin_client)

    response = await admin_client.delete(f"/api/v1/scholarships/{created['id']}")
    assert response.status_code == 204

    check = await admin_client.get(f"/api/v1/scholarships/{created['id']}")
    assert check.status_code == 404
