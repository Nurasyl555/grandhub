from typing import Optional, Tuple, List
from datetime import date, datetime

from sqlmodel.ext.asyncio.session import AsyncSession
from app.schemes import internship
from sqlmodel import select, desc, asc
from sqlalchemy import and_, func, or_
from app.models.internship import Internship


def _parse_date(value: Optional[str | date | datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    if isinstance(value, date):
        return datetime(value.year, value.month, value.day)
    return datetime.strptime(str(value), "%Y-%m-%d")


_SORT_MAP = {
    "created_at": Internship.created_at,
    "published_at": Internship.published_at,
    "deadline": Internship.deadline,
}


class InternshipService:
    async def get_all_internships(
        self,
        session: AsyncSession,
        page: int = 1,
        page_size: int = 20,
        q: Optional[str] = None,
        provider: Optional[str] = None,
        country: Optional[str] = None,
        paid: Optional[bool] = None,
        deadline_from: Optional[str] = None,
        deadline_to: Optional[str] = None,
        sort_by: str = "created_at",
        order: str = "desc",
    ) -> Tuple[List[Internship], int]:
        stmt = select(Internship)

        if q:
            like = f"%{q}%"
            stmt = stmt.where(
                or_(
                    Internship.title.ilike(like),
                    Internship.description.ilike(like),
                )
            )

        if provider:
            stmt = stmt.where(Internship.provider.ilike(f"%{provider}%"))
        if country:
            stmt = stmt.where(Internship.country.ilike(f"%{country}%"))
        if paid is not None:
            stmt = stmt.where(Internship.paid == paid)

        df = _parse_date(deadline_from)
        dt = _parse_date(deadline_to)
        if df and dt:
            stmt = stmt.where(and_(Internship.deadline >= df, Internship.deadline <= dt))
        elif df:
            stmt = stmt.where(Internship.deadline >= df)
        elif dt:
            stmt = stmt.where(Internship.deadline <= dt)

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await session.exec(count_stmt)).one()

        sort_col = _SORT_MAP.get(sort_by, Internship.created_at)
        order_by = desc(sort_col) if order.lower() == "desc" else asc(sort_col)
        stmt = stmt.order_by(order_by)

        offset = (page - 1) * page_size
        stmt = stmt.offset(offset).limit(page_size)

        result = await session.exec(stmt)
        items = result.all()
        return items, total


    async def get_internship(self, internship_id:int, session: AsyncSession):
        statement = select(Internship).where(Internship.id == internship_id)

        result = await session.exec(statement)

        internship = result.first()

        if internship:
            return internship
        else:
            return None

    async def create_internship(self, internship_data: internship.InternshipBase ,session: AsyncSession):
        internship_data_dict = internship_data.model_dump()

        internship_data_dict['source_url'] = str(internship_data_dict['source_url'])
        if internship_data_dict.get('image_url'):
            internship_data_dict['image_url'] = str(internship_data_dict['image_url'])

        if internship_data_dict.get('published_at'):
            internship_data_dict['published_at'] = internship_data_dict['published_at'].replace(tzinfo=None)
        if internship_data_dict.get('deadline'):
            internship_data_dict['deadline'] = internship_data_dict['deadline'].replace(tzinfo=None)

        title = internship_data_dict.get('title', '').strip()
        source_url = internship_data_dict.get('source_url', '').strip()

        # Idempotency: повторный ETL-запуск не должен плодить дубли
        dup_stmt = select(Internship).where(
            and_(Internship.title == title, Internship.source_url == source_url)
        )
        dup = (await session.exec(dup_stmt)).first()
        if dup:
            return dup

        new_internship = Internship(
            **internship_data_dict
        )

        session.add(new_internship)
        await session.commit()
        await session.refresh(new_internship)

        return new_internship

    async def update_internship(self, internship_id:int, update_data:internship.InternshipUpdate ,session: AsyncSession):
        internship_to_update = await self.get_internship(internship_id, session)

        if internship_to_update is None:
            return None
        
        update_data_dict = update_data.model_dump(exclude_unset=True)  # exclude_unset=True

        for k,v in update_data_dict.items():
            setattr(internship_to_update, k, v)

        await session.commit()

        return internship_to_update
    
    async def delete_internship(self, internship_id: int, session: AsyncSession):
        internship_to_delete = await self.get_internship(internship_id, session)
        
        if internship_to_delete is None:
            return None
        
        await session.delete(internship_to_delete)
        await session.commit()

        return True
            
