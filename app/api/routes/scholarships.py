from fastapi import APIRouter, status, Depends, Response, Query
from fastapi.exceptions import HTTPException
from app.schemes import scholarship
from sqlmodel.ext.asyncio.session import AsyncSession
from app.services.scholarshipService import ScholarshipService
#from app.models.scholarship import Scholarship
from typing import List, Optional, Literal
from app.db.main import get_session
from app.auth.dependencies import RoleChecker

router = APIRouter()
scholarship_service = ScholarshipService()
checker_admin = Depends(RoleChecker(['admin']))


@router.get("/", response_model=List[scholarship.ScholarshipRead], status_code=status.HTTP_200_OK)
async def get_all_scholarships(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1, description="Номер страницы, начиная с 1"),
    page_size: int = Query(20, ge=1, le=100, description="Размер страницы"),
    q: Optional[str] = Query(None, description="Поиск по title/description"),
    provider: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    level: Optional[str] = Query(None, description="bachelor, master, phd"),
    deadline_from: Optional[str] = Query(None, description="YYYY-MM-DD"),
    deadline_to: Optional[str] = Query(None, description="YYYY-MM-DD"),
    sort_by: Literal["created_at", "published_at", "deadline"] = Query("created_at"),
    order: Literal["asc", "desc"] = Query("desc"),
    response: Response = None,
):
    items, total = await scholarship_service.get_all_scholarships(
        session=session,
        page=page,
        page_size=page_size,
        q=q,
        provider=provider,
        country=country,
        level=level,
        deadline_from=deadline_from,
        deadline_to=deadline_to,
        sort_by=sort_by,
        order=order,
    )

    response.headers["X-Total-Count"] = str(total)
    response.headers["X-Page"] = str(page)
    response.headers["X-Page-Size"] = str(page_size)
    return items


@router.post("/", response_model=scholarship.ScholarshipRead, status_code=status.HTTP_201_CREATED, dependencies=[checker_admin])
async def create_a_scholarship(scholarship_data: scholarship.ScholarshipCreate, session: AsyncSession = Depends(get_session)):
    new_scholarship = await scholarship_service.create_scholarship(scholarship_data, session)
    return new_scholarship


@router.get("/{scholarship_id}", response_model=scholarship.ScholarshipRead, status_code=status.HTTP_200_OK)
async def get_scholarship(scholarship_id: int, session: AsyncSession = Depends(get_session)):
    scholarship = await scholarship_service.get_scholarship(scholarship_id, session)

    if scholarship:
        return scholarship

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scholarship not found")


@router.patch("/{scholarship_id}", response_model=scholarship.ScholarshipRead, status_code=status.HTTP_202_ACCEPTED, dependencies=[checker_admin])
async def update_scholarship(scholarship_id: int, update_data: scholarship.ScholarshipUpdate, session: AsyncSession = Depends(get_session)):
    updated_scholarship = await scholarship_service.update_scholarship(scholarship_id, update_data, session)

    if updated_scholarship:
        return updated_scholarship

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scholarship not found")


@router.delete("/{scholarship_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[checker_admin])
async def delete_scholarship(scholarship_id: int, session: AsyncSession = Depends(get_session)):
    success = await scholarship_service.delete_scholarship(scholarship_id, session)

    if success:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    raise HTTPException(status_code=404, detail="Scholarship not found")
