import re
import uuid
from datetime import datetime
from typing import Literal

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
        return validate_password_strength(value)


class UserLogin(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=1, max_length=128)


def validate_password_strength(value: str) -> str:
    if not re.search(r"[A-Z]", value):
        raise ValueError("Passwort muss mindestens einen Großbuchstaben enthalten")
    if not re.search(r"[a-z]", value):
        raise ValueError("Passwort muss mindestens einen Kleinbuchstaben enthalten")
    if not re.search(r"\d", value):
        raise ValueError("Passwort muss mindestens eine Zahl enthalten")
    return value


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    is_active: bool
    is_admin: bool = False
    preferences: dict[str, str] | None = None
    created_at: datetime


class UserPreferences(BaseModel):
    default_view_mode: Literal["list", "grid", "compact"] = "list"
    default_scope: Literal["all", "mine", "public"] = "all"


class UserPreferencesUpdate(BaseModel):
    default_view_mode: Literal["list", "grid", "compact"] | None = None
    default_scope: Literal["all", "mine", "public"] | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


class PublicSettingsResponse(BaseModel):
    allow_registration: bool


class AppSettingsResponse(BaseModel):
    allow_registration: bool
    default_prompt_visibility: PromptVisibility
    environment: str


class AppSettingsUpdate(BaseModel):
    allow_registration: bool | None = None
    default_prompt_visibility: PromptVisibility | None = None


class SettingsResponse(BaseModel):
    preferences: UserPreferences
    default_prompt_visibility: PromptVisibility
    app: AppSettingsResponse | None = None


class UserAdminResponse(BaseModel):
    id: uuid.UUID
    username: str
    is_active: bool
    is_admin: bool
    created_at: datetime
    prompt_count: int = 0


class UserAdminUpdate(BaseModel):
    is_active: bool | None = None
    is_admin: bool | None = None


class AdminPasswordReset(BaseModel):
    new_password: str = Field(min_length=12, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return validate_password_strength(value)


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
    copy_count: int = 0
    created_at: datetime
    updated_at: datetime


class CopyResponse(BaseModel):
    id: uuid.UUID
    copy_count: int


class TopCopiedPrompt(BaseModel):
    id: uuid.UUID
    title: str
    model: str
    task: str
    owner_username: str | None = None
    copy_count: int
    created_at: datetime


class NewPromptsPoint(BaseModel):
    date: str
    count: int


class StatsResponse(BaseModel):
    total_public_prompts: int
    total_copies: int
    new_last_7_days: int
    new_last_30_days: int
    most_copied: list[TopCopiedPrompt]
    new_prompts_by_day: list[NewPromptsPoint]


class TaskOption(BaseModel):
    value: str
    label: str


class MetaResponse(BaseModel):
    version: str
    models: list[str]
    tasks: list[TaskOption]
    password_rules: list[dict[str, str]]
    username_rules: list[dict[str, str]]
