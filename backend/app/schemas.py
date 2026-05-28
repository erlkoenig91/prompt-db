import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.constants import TASKS
from app.models import PromptVisibility

USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{3,64}$")
VALID_TASKS = set(TASKS.keys())


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=12, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        if not USERNAME_PATTERN.match(value):
            raise ValueError("Username darf nur Buchstaben, Zahlen, _ und - enthalten")
        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not re.search(r"[A-Z]", value):
            raise ValueError("Passwort muss mindestens einen Großbuchstaben enthalten")
        if not re.search(r"[a-z]", value):
            raise ValueError("Passwort muss mindestens einen Kleinbuchstaben enthalten")
        if not re.search(r"\d", value):
            raise ValueError("Passwort muss mindestens eine Zahl enthalten")
        return value


class UserLogin(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class PromptBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1, max_length=50000)
    description: str | None = Field(default=None, max_length=2000)
    model: str = Field(min_length=1, max_length=128)
    task: str = Field(min_length=1, max_length=64)
    visibility: PromptVisibility = PromptVisibility.PRIVATE
    tags: str | None = Field(default=None, max_length=500)

    @field_validator("model")
    @classmethod
    def normalize_model(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Modellname darf nicht leer sein")
        return normalized

    @field_validator("task")
    @classmethod
    def validate_task(cls, value: str) -> str:
        if value not in VALID_TASKS:
            labels = ", ".join(TASKS.values())
            raise ValueError(f"Ungültige Aufgabe. Erlaubt: {labels}")
        return value


class PromptCreate(PromptBase):
    pass


class PromptUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1, max_length=50000)
    description: str | None = Field(default=None, max_length=2000)
    model: str | None = Field(default=None, min_length=1, max_length=128)
    task: str | None = Field(default=None, min_length=1, max_length=64)
    visibility: PromptVisibility | None = None
    tags: str | None = Field(default=None, max_length=500)

    @field_validator("model")
    @classmethod
    def normalize_model(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("Modellname darf nicht leer sein")
        return normalized

    @field_validator("task")
    @classmethod
    def validate_task(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if value not in VALID_TASKS:
            raise ValueError("Ungültige Aufgabe")
        return value


class PromptResponse(PromptBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    owner_username: str | None = None
    created_at: datetime
    updated_at: datetime


class TaskOption(BaseModel):
    value: str
    label: str


class MetaResponse(BaseModel):
    version: str
    models: list[str]
    tasks: list[TaskOption]
    password_rules: list[dict[str, str]]
    username_rules: list[dict[str, str]]
