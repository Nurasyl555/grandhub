from pydantic import BaseModel, Field
import uuid
from datetime import datetime
from typing import List, Optional


class UserCreateModel(BaseModel):
    first_name: str = Field(max_length=10)
    last_name: str = Field(max_length=10)
    username: str = Field(max_length=20)
    email: str = Field(max_length=30)
    password: str = Field(min_length=8)
    interests: Optional[str] = Field(
        default=None,
        description="Свободный текст: чем интересуется пользователь, "
        "используется для подбора рекомендаций",
    )

class UserModel(BaseModel):
    uid : uuid.UUID
    username: str
    email: str
    first_name: str
    last_name: str
    is_verified: bool
    password_hash: str = Field(exclude=True)
    interests: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class UserResponse(BaseModel):
    uid : uuid.UUID
    username: str
    email: str
    first_name: str
    last_name: str
    is_verified: bool
    interests: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class UserUpdateModel(BaseModel):
    interests: Optional[str] = None


class UserLoginModel(BaseModel):
    email: str = Field(max_length=30)
    password: str = Field(min_length=8)

class EmailModel(BaseModel):
    addresses: List[str]
class PasswordResetRequestModel(BaseModel):
    email: str

class PasswordResetConfirmModel(BaseModel):
    new_password: str
    confirm_new_password: str