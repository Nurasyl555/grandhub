from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, desc

from app.models.application import Application, ApplicationStatus
from app.models.grant import Grant
from app.models.internship import Internship
from app.models.scholarship import Scholarship
from app.schemes.application import ApplicationCreate, ApplicationUpdate

type_map = {
    "grant": Grant,
    "internship": Internship,
    "scholarship": Scholarship,
}


class ApplicationService:
    async def list_for_user(
        self,
        user_id: UUID,
        session: AsyncSession,
        status: Optional[ApplicationStatus] = None,
    ) -> List[Dict[str, Any]]:
        stmt = select(Application).where(Application.user_id == user_id)
        if status is not None:
            stmt = stmt.where(Application.status == status)
        stmt = stmt.order_by(desc(Application.updated_at))

        applications = (await session.exec(stmt)).all()

        # Подгружаем сами возможности одним запросом на тип — тот же приём,
        # что и в RecommendationService.get_recommendations_for_user, чтобы
        # фронту не нужно было делать отдельный запрос за деталями каждой
        # карточки.
        grouped_ids: Dict[str, List[int]] = {"grant": [], "internship": [], "scholarship": []}
        for app in applications:
            grouped_ids[app.item_type].append(app.item_id)

        loaded: Dict[str, Dict[int, Any]] = {}
        for item_type, ids in grouped_ids.items():
            model = type_map.get(item_type)
            if model and ids:
                items = (await session.exec(select(model).where(model.id.in_(ids)))).all()
                loaded[item_type] = {item.id: item for item in items}

        result = []
        for app in applications:
            result.append(
                {
                    "id": app.id,
                    "user_id": app.user_id,
                    "item_type": app.item_type,
                    "item_id": app.item_id,
                    "status": app.status,
                    "note": app.note,
                    "created_at": app.created_at,
                    "updated_at": app.updated_at,
                    "submitted_at": app.submitted_at,
                    "data": loaded.get(app.item_type, {}).get(app.item_id),
                }
            )
        return result

    async def create(
        self, user_id: UUID, payload: ApplicationCreate, session: AsyncSession
    ) -> Application:
        model = type_map.get(payload.item_type.value)
        item = await session.get(model, payload.item_id) if model else None
        if item is None:
            raise ValueError(f"{payload.item_type.value} с id={payload.item_id} не найден")

        application = Application(
            user_id=user_id,
            item_type=payload.item_type,
            item_id=payload.item_id,
            status=payload.status or ApplicationStatus.draft,
            note=payload.note,
        )
        if application.status == ApplicationStatus.submitted:
            application.submitted_at = datetime.now()

        session.add(application)
        await session.commit()
        await session.refresh(application)
        return application

    async def _get_owned(
        self, application_id: int, user_id: UUID, session: AsyncSession
    ) -> Optional[Application]:
        # user_id — часть WHERE, а не проверка постфактум: чужая заявка
        # должна выглядеть как "не найдена", а не как "есть, но нельзя".
        stmt = select(Application).where(
            Application.id == application_id, Application.user_id == user_id
        )
        return (await session.exec(stmt)).first()

    async def update(
        self,
        application_id: int,
        user_id: UUID,
        payload: ApplicationUpdate,
        session: AsyncSession,
    ) -> Optional[Application]:
        application = await self._get_owned(application_id, user_id, session)
        if application is None:
            return None

        data = payload.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(application, key, value)

        if data.get("status") == ApplicationStatus.submitted and application.submitted_at is None:
            application.submitted_at = datetime.now()

        application.updated_at = datetime.now()

        await session.commit()
        await session.refresh(application)
        return application

    async def delete(self, application_id: int, user_id: UUID, session: AsyncSession) -> bool:
        application = await self._get_owned(application_id, user_id, session)
        if application is None:
            return False

        await session.delete(application)
        await session.commit()
        return True
