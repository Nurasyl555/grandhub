from datetime import datetime, timedelta

from sqlmodel.ext.asyncio.session import AsyncSession

from app.schemes.grant import GrantCreate, GrantUpdate
from app.services.grantService import GrantService

service = GrantService()


def _grant_payload(**overrides) -> GrantCreate:
    data = dict(
        title="MIT Research Grant",
        description="Funding for AI research",
        source_url="https://example.com/mit-grant",
        provider="MIT",
        country="USA",
    )
    data.update(overrides)
    return GrantCreate(**data)


async def test_create_grant(session: AsyncSession):
    created = await service.create_grant(_grant_payload(), session)

    assert created.id is not None
    assert created.title == "MIT Research Grant"


async def test_create_grant_is_idempotent_on_title_and_source_url(session: AsyncSession):
    """
    GrantService дедуплицирует по (title, source_url) — см. grantService.py:111-118.
    Повторное создание с теми же title+source_url должно вернуть ту же запись,
    а не создать дубликат.
    """
    first = await service.create_grant(_grant_payload(), session)
    second = await service.create_grant(_grant_payload(description="different text"), session)

    assert first.id == second.id

    items, total = await service.get_all_grants(session)
    assert total == 1


async def test_get_grant_not_found_returns_none(session: AsyncSession):
    result = await service.get_grant(999, session)
    assert result is None


async def test_update_grant(session: AsyncSession):
    created = await service.create_grant(_grant_payload(), session)

    updated = await service.update_grant(
        created.id, GrantUpdate(title="Updated Title"), session
    )

    assert updated.title == "Updated Title"
    assert updated.description == "Funding for AI research"  # не тронуто


async def test_update_grant_not_found_returns_none(session: AsyncSession):
    result = await service.update_grant(999, GrantUpdate(title="X"), session)
    assert result is None


async def test_delete_grant(session: AsyncSession):
    created = await service.create_grant(_grant_payload(), session)

    ok = await service.delete_grant(created.id, session)
    assert ok is True

    assert await service.get_grant(created.id, session) is None


async def test_pagination_returns_correct_page_and_total(session: AsyncSession):
    for i in range(5):
        await service.create_grant(
            _grant_payload(title=f"Grant {i}", source_url=f"https://example.com/{i}"),
            session,
        )

    items, total = await service.get_all_grants(session, page=2, page_size=2)

    assert total == 5
    assert len(items) == 2


async def test_search_by_title_or_description(session: AsyncSession):
    await service.create_grant(
        _grant_payload(title="Climate Fund", source_url="https://example.com/a"), session
    )
    await service.create_grant(
        _grant_payload(title="Health Fund", source_url="https://example.com/b"), session
    )

    items, total = await service.get_all_grants(session, q="Climate")

    assert total == 1
    assert items[0].title == "Climate Fund"


async def test_filter_by_provider(session: AsyncSession):
    await service.create_grant(
        _grant_payload(provider="NASA", source_url="https://example.com/a"), session
    )
    await service.create_grant(
        _grant_payload(provider="NSF", source_url="https://example.com/b"), session
    )

    items, total = await service.get_all_grants(session, provider="NASA")

    assert total == 1
    assert items[0].provider == "NASA"


async def test_filter_by_deadline_range(session: AsyncSession):
    now = datetime.now()
    await service.create_grant(
        _grant_payload(
            deadline=now + timedelta(days=5),
            source_url="https://example.com/soon",
        ),
        session,
    )
    await service.create_grant(
        _grant_payload(
            deadline=now + timedelta(days=60),
            source_url="https://example.com/later",
        ),
        session,
    )

    deadline_from = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    deadline_to = (now + timedelta(days=10)).strftime("%Y-%m-%d")

    items, total = await service.get_all_grants(
        session, deadline_from=deadline_from, deadline_to=deadline_to
    )

    assert total == 1
    assert items[0].source_url == "https://example.com/soon"


async def test_sort_order_asc_vs_desc(session: AsyncSession):
    first = await service.create_grant(
        _grant_payload(title="First", source_url="https://example.com/1"), session
    )
    second = await service.create_grant(
        _grant_payload(title="Second", source_url="https://example.com/2"), session
    )

    items_desc, _ = await service.get_all_grants(session, sort_by="created_at", order="desc")
    items_asc, _ = await service.get_all_grants(session, sort_by="created_at", order="asc")

    assert items_desc[0].id == second.id
    assert items_asc[0].id == first.id
