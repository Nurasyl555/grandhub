from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth.dependencies import RoleChecker, get_current_user
from app.auth.models import User
from app.db.main import get_session
from app.models.application import ApplicationStatus
from app.schemes.application import ApplicationCreate, ApplicationRead, ApplicationUpdate
from app.services.applicationService import ApplicationService

router = APIRouter()

role_checker = RoleChecker(["admin", "user"])
application_service = ApplicationService()


@router.get("/")
async def list_applications(
    status: ApplicationStatus | None = Query(
        None, description="Фильтр: 'draft' | 'active' | 'submitted'"
    ),
    current_user: User = Depends(get_current_user),
    _: bool = Depends(role_checker),
    session: AsyncSession = Depends(get_session),
):
    """
    Заявки текущего пользователя. Каждая запись сразу включает `data` —
    саму возможность (title, deadline и т.д.), как в GET /recommendations/.
    """
    applications = await application_service.list_for_user(current_user.uid, session, status=status)
    return {"user_id": str(current_user.uid), "applications": applications}


@router.post("/", response_model=ApplicationRead, status_code=status.HTTP_201_CREATED)
async def create_application(
    payload: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    _: bool = Depends(role_checker),
    session: AsyncSession = Depends(get_session),
):
    # user_id всегда берётся из токена, а не из тела запроса — иначе можно
    # было бы создать заявку от имени другого пользователя.
    try:
        return await application_service.create(current_user.uid, payload, session)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{application_id}", response_model=ApplicationRead)
async def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    _: bool = Depends(role_checker),
    session: AsyncSession = Depends(get_session),
):
    updated = await application_service.update(application_id, current_user.uid, payload, session)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return updated


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    _: bool = Depends(role_checker),
    session: AsyncSession = Depends(get_session),
):
    deleted = await application_service.delete(application_id, current_user.uid, session)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
