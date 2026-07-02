from httpx import AsyncClient


async def _create_internship(admin_client: AsyncClient, **overrides) -> dict:
    payload = dict(
        title="Google Summer Internship",
        description="12-week paid internship",
        source_url="https://example.com/google",
        provider="Google",
        country="USA",
        paid=True,
    )
    payload.update(overrides)
    response = await admin_client.post("/api/v1/internships/", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


async def test_list_internships_filter_by_paid(admin_client: AsyncClient):
    await _create_internship(admin_client, paid=True, source_url="https://example.com/a")
    await _create_internship(admin_client, paid=False, source_url="https://example.com/b")

    response = await admin_client.get("/api/v1/internships/?paid=false")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["paid"] is False


async def test_list_internships_total_count_header(admin_client: AsyncClient):
    for i in range(3):
        await _create_internship(admin_client, source_url=f"https://example.com/{i}")

    response = await admin_client.get("/api/v1/internships/?page_size=2")

    assert response.headers["x-total-count"] == "3"
    assert len(response.json()) == 2


async def test_update_internship_requires_admin(client: AsyncClient):
    response = await client.patch("/api/v1/internships/1", json={"duration": "3 months"})
    assert response.status_code in (401, 403)
