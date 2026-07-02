from httpx import AsyncClient


async def test_health_endpoint_reports_db_status(client: AsyncClient):
    response = await client.get("/api/v1/health")

    # В тестовом окружении DB (in-memory SQLite) всегда доступна.
    # Redis (Upstash) недоступен в тестах -> ответ будет 503, но
    # это ожидаемо и правильно: health-check должен честно говорить,
    # что часть зависимостей не готова.
    assert response.status_code in (200, 503)
    body = response.json()
    assert body["db"] == "ok"
    assert "redis" in body
