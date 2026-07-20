import uuid

from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.application import ApplicationStatus
from app.schemes.application import ApplicationCreate, ApplicationUpdate
from app.schemes.grant import GrantCreate
from app.services.applicationService import ApplicationService
from app.services.grantService import GrantService

service = ApplicationService()
grant_service = GrantService()


async def _make_grant(session: AsyncSession, **overrides):
    data = dict(
        title="Test Grant",
        description="A grant for application tests",
        source_url="https://example.com/app-grant",
        provider="Test Foundation",
    )
    data.update(overrides)
    return await grant_service.create_grant(GrantCreate(**data), session)


async def test_create_application(session: AsyncSession):
    grant = await _make_grant(session)
    user_id = uuid.uuid4()

    app = await service.create(
        user_id, ApplicationCreate(item_type="grant", item_id=grant.id), session
    )

    assert app.id is not None
    assert app.status == ApplicationStatus.draft
    assert app.submitted_at is None


async def test_create_rejects_nonexistent_item(session: AsyncSession):
    user_id = uuid.uuid4()
    try:
        await service.create(
            user_id, ApplicationCreate(item_type="grant", item_id=999999), session
        )
        assert False, "expected ValueError"
    except ValueError:
        pass


async def test_submitted_status_sets_submitted_at(session: AsyncSession):
    grant = await _make_grant(session)
    user_id = uuid.uuid4()

    app = await service.create(
        user_id,
        ApplicationCreate(item_type="grant", item_id=grant.id, status=ApplicationStatus.submitted),
        session,
    )

    assert app.submitted_at is not None


async def test_list_for_user_embeds_opportunity_data(session: AsyncSession):
    grant = await _make_grant(session)
    user_id = uuid.uuid4()
    await service.create(user_id, ApplicationCreate(item_type="grant", item_id=grant.id), session)

    items = await service.list_for_user(user_id, session)

    assert len(items) == 1
    assert items[0]["data"].title == "Test Grant"


async def test_list_filters_by_status(session: AsyncSession):
    grant = await _make_grant(session)
    user_id = uuid.uuid4()
    await service.create(user_id, ApplicationCreate(item_type="grant", item_id=grant.id, status=ApplicationStatus.draft), session)
    await service.create(
        user_id,
        ApplicationCreate(item_type="grant", item_id=grant.id, status=ApplicationStatus.submitted),
        session,
    )

    submitted = await service.list_for_user(user_id, session, status=ApplicationStatus.submitted)

    assert len(submitted) == 1
    assert submitted[0]["status"] == ApplicationStatus.submitted


async def test_list_does_not_leak_other_users_applications(session: AsyncSession):
    grant = await _make_grant(session)
    user_a, user_b = uuid.uuid4(), uuid.uuid4()
    await service.create(user_a, ApplicationCreate(item_type="grant", item_id=grant.id), session)

    items_b = await service.list_for_user(user_b, session)

    assert items_b == []


async def test_update_transitions_to_submitted_sets_timestamp(session: AsyncSession):
    grant = await _make_grant(session)
    user_id = uuid.uuid4()
    app = await service.create(user_id, ApplicationCreate(item_type="grant", item_id=grant.id), session)

    updated = await service.update(
        app.id, user_id, ApplicationUpdate(status=ApplicationStatus.submitted), session
    )

    assert updated.status == ApplicationStatus.submitted
    assert updated.submitted_at is not None


async def test_cannot_update_someone_elses_application(session: AsyncSession):
    grant = await _make_grant(session)
    owner, attacker = uuid.uuid4(), uuid.uuid4()
    app = await service.create(owner, ApplicationCreate(item_type="grant", item_id=grant.id), session)

    result = await service.update(app.id, attacker, ApplicationUpdate(note="hijacked"), session)

    assert result is None


async def test_cannot_delete_someone_elses_application(session: AsyncSession):
    grant = await _make_grant(session)
    owner, attacker = uuid.uuid4(), uuid.uuid4()
    app = await service.create(owner, ApplicationCreate(item_type="grant", item_id=grant.id), session)

    deleted = await service.delete(app.id, attacker, session)

    assert deleted is False
    # запись реально осталась у владельца
    still_there = await service.list_for_user(owner, session)
    assert len(still_there) == 1


async def test_delete_own_application(session: AsyncSession):
    grant = await _make_grant(session)
    user_id = uuid.uuid4()
    app = await service.create(user_id, ApplicationCreate(item_type="grant", item_id=grant.id), session)

    deleted = await service.delete(app.id, user_id, session)

    assert deleted is True
    assert await service.list_for_user(user_id, session) == []
