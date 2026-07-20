from sqlmodel import SQLModel, Field, Column
from enum import Enum
from typing import Optional
from uuid import UUID
from datetime import datetime
import sqlalchemy.dialects.postgresql as pg

from app.models.recommendation import ItemType


class ApplicationStatus(str, Enum):
    draft = "draft"
    active = "active"
    submitted = "submitted"


class Application(SQLModel, table=True):
    __tablename__ = "applications"

    id: Optional[int] = Field(default=None, primary_key=True)

    user_id: UUID = Field(foreign_key="users.uid", index=True)
    item_type: ItemType = Field(index=True)
    item_id: int = Field(index=True)

    status: ApplicationStatus = Field(default=ApplicationStatus.draft, index=True)
    note: Optional[str] = Field(default=None, sa_column=Column(pg.TEXT, nullable=True))

    created_at: datetime = Field(sa_column=Column(pg.TIMESTAMP, default=datetime.now))
    updated_at: datetime = Field(sa_column=Column(pg.TIMESTAMP, default=datetime.now))
    submitted_at: Optional[datetime] = Field(
        default=None, sa_column=Column(pg.TIMESTAMP, nullable=True)
    )

    def __repr__(self):
        return f"<Application {self.item_type}:{self.item_id} status={self.status}>"
