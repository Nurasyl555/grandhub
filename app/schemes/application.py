from typing import Optional
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from app.models.application import ApplicationStatus
from app.models.recommendation import ItemType


class ApplicationCreate(BaseModel):
    item_type: ItemType
    item_id: int
    status: Optional[ApplicationStatus] = ApplicationStatus.draft
    note: Optional[str] = None


class ApplicationUpdate(BaseModel):
    status: Optional[ApplicationStatus] = None
    note: Optional[str] = None


class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: UUID
    item_type: ItemType
    item_id: int
    status: ApplicationStatus
    note: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime] = None
