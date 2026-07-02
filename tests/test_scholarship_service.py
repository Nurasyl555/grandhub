from sqlmodel.ext.asyncio.session import AsyncSession

from app.schemes.scholarship import ScholarshipCreate
from app.services.scholarshipService import ScholarshipService

service = ScholarshipService()


def _payload(**overrides) -> ScholarshipCreate:
    data = dict(
        title="Oxford Master Scholarship",
        description="Full tuition coverage",
        source_url="https://example.com/oxford",
        provider="Oxford",
        country="UK",
        level="master",
    )
    data.update(overrides)
    return ScholarshipCreate(**data)


async def test_create_and_get_scholarship(session: AsyncSession):
    created = await service.create_scholarship(_payload(), session)

    fetched = await service.get_scholarship(created.id, session)
    assert fetched is not None
    assert fetched.title == "Oxford Master Scholarship"


async def test_filter_by_level(session: AsyncSession):
    await service.create_scholarship(
        _payload(level="bachelor", source_url="https://example.com/a"), session
    )
    await service.create_scholarship(
        _payload(level="phd", source_url="https://example.com/b"), session
    )

    items, total = await service.get_all_scholarships(session, level="phd")

    assert total == 1
    assert items[0].level == "phd"


async def test_pagination(session: AsyncSession):
    for i in range(3):
        await service.create_scholarship(
            _payload(title=f"Scholarship {i}", source_url=f"https://example.com/{i}"),
            session,
        )

    items, total = await service.get_all_scholarships(session, page=1, page_size=2)

    assert total == 3
    assert len(items) == 2


async def test_update_and_delete_scholarship(session: AsyncSession):
    from app.schemes.scholarship import ScholarshipUpdate

    created = await service.create_scholarship(_payload(), session)

    updated = await service.update_scholarship(
        created.id, ScholarshipUpdate(title="Renamed"), session
    )
    assert updated.title == "Renamed"

    ok = await service.delete_scholarship(created.id, session)
    assert ok is True
    assert await service.get_scholarship(created.id, session) is None
