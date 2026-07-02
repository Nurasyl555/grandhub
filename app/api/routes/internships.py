from fastapi import APIRouter, status, Depends, Response, Query
from fastapi.exceptions import HTTPException
from app.schemes import internship
from sqlmodel.ext.asyncio.session import AsyncSession
from app.services.internshipService import InternshipService
from app.models.internship import Internship
from typing import List, Optional, Literal
from app.db.main import get_session
from app.auth.dependencies import RoleChecker

router = APIRouter()
internship_service = InternshipService()
checker_admin = Depends(RoleChecker(['admin']))


@router.get("/", response_model=List[internship.InternshipRead], status_code=status.HTTP_200_OK)
async def get_all_internships(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    page_size: int = Query(20, ge=1, le=100, description="Размер страницы"),
    q: Optional[str] = Query(None, description="Поиск по title/description"),
    provider: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    paid: Optional[bool] = Query(None),
    deadline_from: Optional[str] = Query(None, description="YYYY-MM-DD"),
    deadline_to: Optional[str] = Query(None, description="YYYY-MM-DD"),
    sort_by: Literal["created_at", "published_at", "deadline"] = Query("created_at"),
    order: Literal["asc", "desc"] = Query("desc"),
    response: Response = None,
):
    items, total = await internship_service.get_all_internships(
        session=session,
        page=page,
        page_size=page_size,
        q=q,
        provider=provider,
        country=country,
        paid=paid,
        deadline_from=deadline_from,
        deadline_to=deadline_to,
        sort_by=sort_by,
        order=order,
    )

    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(page_size)
    return items


@router.post("/", response_model=internship.InternshipRead, status_code=status.HTTP_201_CREATED, dependencies=[checker_admin])
async def create_an_internship(internship_data: internship.InternshipCreate, session: AsyncSession = Depends(get_session)):
    new_internship = await internship_service.create_internship(internship_data, session)
    return new_internship


@router.get("/{internship_id}", response_model=internship.InternshipRead, status_code=status.HTTP_200_OK)
async def get_internship(internship_id: int, session: AsyncSession = Depends(get_session)):
    internship = await internship_service.get_internship(internship_id, session)

    if internship:
        return internship

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Internship not found")


@router.patch("/{internship_id}", response_model=internship.InternshipRead, status_code=status.HTTP_202_ACCEPTED, dependencies=[checker_admin])
async def update_internship(internship_id: int, update_data: internship.InternshipUpdate, session: AsyncSession = Depends(get_session)):
    updated_internship = await internship_service.update_internship(internship_id, update_data, session)

    if updated_internship:
        return updated_internship
    
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Internship not found")


@router.delete("/{internship_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[checker_admin])
async def delete_internship(internship_id: int, session: AsyncSession = Depends(get_session)):
    success = await internship_service.delete_internship(internship_id, session)

    if success:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    raise HTTPException(status_code=404, detail="Internship not found")
