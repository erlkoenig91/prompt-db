from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import AppSetting, PromptVisibility

ALLOW_REGISTRATION_KEY = "allow_registration"
DEFAULT_PROMPT_VISIBILITY_KEY = "default_prompt_visibility"

DEFAULT_PREFERENCES = {
    "default_view_mode": "list",
    "default_scope": "all",
}


def normalize_preferences(raw: dict | None) -> dict[str, str]:
    prefs = dict(DEFAULT_PREFERENCES)
    if not raw:
        return prefs
    view_mode = raw.get("default_view_mode")
    if view_mode in {"list", "grid", "compact"}:
        prefs["default_view_mode"] = view_mode
    scope = raw.get("default_scope")
    if scope in {"all", "mine", "public"}:
        prefs["default_scope"] = scope
    return prefs


async def _get_setting(db: AsyncSession, key: str) -> str | None:
    result = await db.execute(select(AppSetting.value).where(AppSetting.key == key))
    return result.scalar_one_or_none()


async def _set_setting(db: AsyncSession, key: str, value: str) -> None:
    result = await db.execute(select(AppSetting).where(AppSetting.key == key))
    row = result.scalar_one_or_none()
    if row:
        row.value = value
    else:
        db.add(AppSetting(key=key, value=value))


async def get_allow_registration(db: AsyncSession) -> bool:
    stored = await _get_setting(db, ALLOW_REGISTRATION_KEY)
    if stored is not None:
        return stored.lower() == "true"
    return get_settings().allow_registration


async def set_allow_registration(db: AsyncSession, enabled: bool) -> None:
    await _set_setting(db, ALLOW_REGISTRATION_KEY, "true" if enabled else "false")


async def get_default_prompt_visibility(db: AsyncSession) -> PromptVisibility:
    stored = await _get_setting(db, DEFAULT_PROMPT_VISIBILITY_KEY)
    if stored == PromptVisibility.PUBLIC.value:
        return PromptVisibility.PUBLIC
    return PromptVisibility.PRIVATE


async def set_default_prompt_visibility(db: AsyncSession, visibility: PromptVisibility) -> None:
    await _set_setting(db, DEFAULT_PROMPT_VISIBILITY_KEY, visibility.value)


async def get_public_settings(db: AsyncSession) -> dict[str, bool | str]:
    return {
        "allow_registration": await get_allow_registration(db),
    }


async def get_app_settings(db: AsyncSession) -> dict[str, bool | str]:
    settings = get_settings()
    visibility = await get_default_prompt_visibility(db)
    return {
        "allow_registration": await get_allow_registration(db),
        "default_prompt_visibility": visibility.value,
        "environment": settings.environment,
    }
