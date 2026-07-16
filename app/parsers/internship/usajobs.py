from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.schemes.internship import InternshipCreate
from app.services.internshipService import InternshipService

BASE_URL = "https://data.usajobs.gov/api/search"

# https://developer.usajobs.gov/api-reference/get-codelist-positionofferingtypes
POSITION_OFFERING_TYPE_INTERNSHIP = "15328"


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None


def _to_internship_create(item: Dict[str, Any]) -> InternshipCreate:
    descriptor = item["MatchedObjectDescriptor"]

    locations = descriptor.get("PositionLocation") or []
    first_location = locations[0] if locations else {}

    description = descriptor.get("QualificationSummary") or ""
    if not description:
        description = descriptor.get("UserArea", {}).get("Details", {}).get("JobSummary", "") or ""

    remuneration = descriptor.get("PositionRemuneration") or []
    paid = None
    if remuneration:
        try:
            paid = float(remuneration[0].get("MinimumRange", 0)) > 0
        except (TypeError, ValueError):
            paid = None

    # PositionSchedule[].Name обычно короткая метка ("Full-Time", "Part-Time"),
    # но иногда агентство кладёт туда целый абзац — в поле duration (это тег
    # на карточке) такое не нужно, отбрасываем всё длиннее короткой метки.
    schedules = descriptor.get("PositionSchedule") or []
    duration = schedules[0].get("Name") if schedules else None
    if duration and len(duration) > 40:
        duration = None

    return InternshipCreate(
        title=(descriptor.get("PositionTitle") or "Untitled").strip(),
        description=description.strip(),
        source_url=descriptor.get("PositionURI"),
        provider=(descriptor.get("OrganizationName") or "USAJOBS").strip(),
        country=first_location.get("CountryCode") or "USA",
        region=first_location.get("CountrySubDivisionCode"),
        language="en",
        deadline=_parse_date(descriptor.get("ApplicationCloseDate")),
        published_at=_parse_date(descriptor.get("PositionStartDate")),
        duration=duration,
        paid=paid,
        image_url=None,
    )


async def fetch_internships_from_usajobs(
    session: AsyncSession,
    keyword: Optional[str] = None,
    location_name: Optional[str] = None,
    results_per_page: int = 100,
    max_pages: int = 1,
    throttle_sec: float = 0.5,
) -> List[int]:
    """
    Тянет открытые стажировки с официального USAJOBS Search API
    (PositionOfferingTypeCode=15328 "Internships") и сохраняет их через
    InternshipService. Требует бесплатный API-ключ:
    https://developer.usajobs.gov/APIRequest/Index
    """
    if not settings.USAJOBS_API_KEY or not settings.USAJOBS_USER_AGENT:
        raise RuntimeError(
            "USAJOBS_API_KEY / USAJOBS_USER_AGENT не заданы в .env. "
            "Получить бесплатный ключ: https://developer.usajobs.gov/APIRequest/Index"
        )

    headers = {
        "Host": "data.usajobs.gov",
        "User-Agent": settings.USAJOBS_USER_AGENT,
        "Authorization-Key": settings.USAJOBS_API_KEY,
    }

    params: Dict[str, Any] = {
        "PositionOfferingTypeCode": POSITION_OFFERING_TYPE_INTERNSHIP,
        "ResultsPerPage": min(results_per_page, 500),
    }
    if keyword:
        params["Keyword"] = keyword
    if location_name:
        params["LocationName"] = location_name

    internship_service = InternshipService()
    created_ids: List[int] = []

    async with httpx.AsyncClient(headers=headers, timeout=40) as client:
        for page in range(1, max_pages + 1):
            resp = await client.get(BASE_URL, params={**params, "Page": page})
            resp.raise_for_status()
            data = resp.json()

            items = data.get("SearchResult", {}).get("SearchResultItems", [])
            if not items:
                break

            for item in items:
                try:
                    payload = _to_internship_create(item)
                    new_internship = await internship_service.create_internship(payload, session)
                    created_ids.append(new_internship.id)
                except Exception:
                    # Пропускаем отдельную некорректную запись, не роняем весь импорт
                    continue

            if throttle_sec:
                await asyncio.sleep(throttle_sec)

    return created_ids
