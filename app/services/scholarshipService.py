from typing import Optional, Tuple, List
from datetime import date, datetime

from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select, desc, asc
from sqlalchemy import func, or_, and_

from app.schemes import scholarship
from app.models.scholarship import Scholarship


def _parse_date(value: Optional[str | date | datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day)
    return datetime.strptime(str(value), "%Y-%m-%d")


_SORT_MAP = {
    "created_at": Scholarship.created_at,
    "published_at": Scholarship.published_at,
    "deadline": Scholarship.deadline,
}


class ScholarshipService:
    async def get_all_scholarships(
        self,
        session: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
        provider: Optional[str] = None,
        country: Optional[str] = None,
        level: Optional[str] = None,
        deadline_from: Optional[str] = None,
        deadline_to: Optional[str] = None,
        sort_by: str = "created_at",
        order: str = "desc",
    ) -> Tuple[List[Scholarship], int]:
        stmt = select(Scholarship)

        if q:
            like = f"%{q}%"
            stmt = stmt.where(
                or_(
                    Scholarship.title.ilike(like),
                    Scholarship.description.ilike(like),
                )
            )

        if provider:
            stmt = stmt.where(Scholarship.provider.ilike(f"%{provider}%"))
        if country:
            stmt = stmt.where(Scholarship.country.ilike(f"%{country}%"))
        if level:
            stmt = stmt.where(Scholarship.level.ilike(f"%{level}%"))

        df = _parse_date(deadline_from)
        dt = _parse_date(deadline_to)
        if df and dt:
            stmt = stmt.where(and_(Scholarship.deadline >= df, Scholarship.deadline <= dt))
        elif df:
            stmt = stmt.where(Scholarship.deadline >= df)
        elif dt:
            stmt = stmt.where(Scholarship.deadline <= dt)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await session.exec(count_stmt)).one()

        sort_col = _SORT_MAP.get(sort_by, Scholarship.created_at)
        order_by = desc(sort_col) if order.lower() == "desc" else asc(sort_col)
        stmt = stmt.order_by(order_by)

        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        result = await session.exec(stmt)
        items = result.all()
        return items, total


    async def get_scholarship(self, scholarship_id: int, session: AsyncSession):
        statement = select(Scholarship).where(Scholarship.id == scholarship_id)
        result = await session.exec(statement)
        scholarship_obj = result.first()
        return scholarship_obj

    async def create_scholarship(self, scholarship_data: scholarship.ScholarshipBase, session: AsyncSession):
        scholarship_data_dict = scholarship_data.model_dump()

        scholarship_data_dict['source_url'] = str(scholarship_data_dict['source_url'])
        if scholarship_data_dict.get('image_url'):
            scholarship_data_dict['image_url'] = str(scholarship_data_dict['image_url'])

        if scholarship_data_dict.get('published_at'):
            scholarship_data_dict['published_at'] = scholarship_data_dict['published_at'].replace(tzinfo=None)
        if scholarship_data_dict.get('deadline'):
            scholarship_data_dict['deadline'] = scholarship_data_dict['deadline'].replace(tzinfo=None)

        # deadline_text просто прокидываем как есть (может быть None/str)
        new_scholarship = Scholarship(**scholarship_data_dict)

        session.add(new_scholarship)
        await session.commit()
        return new_scholarship

    async def update_scholarship(self, scholarship_id: int, update_data: scholarship.ScholarshipUpdate, session: AsyncSession):
        scholarship_to_update = await self.get_scholarship(scholarship_id, session)
        if scholarship_to_update is None:
            return None
        
        update_data_dict = update_data.model_dump(exclude_unset=True)

        for key, value in update_data_dict.items():
            setattr(scholarship_to_update, key, value)

        await session.commit()
        return scholarship_to_update

    async def delete_scholarship(self, scholarship_id: int, session: AsyncSession):
        scholarship_to_delete = await self.get_scholarship(scholarship_id, session)
        if scholarship_to_delete is None:
            return None
        
        await session.delete(scholarship_to_delete)
        await session.commit()
        return True
