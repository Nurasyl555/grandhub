from sqlmodel.ext.asyncio.session import AsyncSession

from app.schemes.internship import InternshipCreate
from app.services.internshipService import InternshipService

service = InternshipService()


def _payload(**overrides) -> InternshipCreate:
    data = dict(
        title="Google Summer Internship",
        description="12-week paid internship",
        source_url="https://example.com/google",
        provider="Google",
        country="USA",
        paid=True,
    )
    data.update(overrides)
    return InternshipCreate(**data)


async def test_create_and_get_internship(session: AsyncSession):
    created = await service.create_internship(_payload(), session)

    fetched = await service.get_internship(created.id, session)
    assert fetched is not None
    assert fetched.paid is True


async def test_filter_by_paid(session: AsyncSession):
    await service.create_internship(
        _payload(paid=True, source_url="https://example.com/a"), session
    )
    await service.create_internship(
        _payload(paid=False, source_url="https://example.com/b"), session
    )

    items, total = await service.get_all_internships(session, paid=False)

    assert total == 1
    assert items[0].paid is False


async def test_pagination(session: AsyncSession):
    for i in range(3):
        await service.create_internship(
            _payload(title=f"Internship {i}", source_url=f"https://example.com/{i}"),
            session,
        )

    items, total = await service.get_all_internships(session, page=2, page_size=2)

    assert total == 3
    assert len(items) == 1


async def test_update_and_delete_internship(session: AsyncSession):
    from app.schemes.internship import InternshipUpdate

    created = await service.create_internship(_payload(), session)

    updated = await service.update_internship(
        created.id, InternshipUpdate(duration="6 months"), session
    )
    assert updated.duration == "6 months"

    ok = await service.delete_internship(created.id, session)
    assert ok is True
    assert await service.get_internship(created.id, session) is None
