from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_admin_user, get_current_user
from app.models import PromptVisibility, User
from app.schemas import (
    AppSettingsResponse,
    AppSettingsUpdate,
    PasswordChangeRequest,
    PublicSettingsResponse,
    SettingsResponse,
    UserPreferences,
    UserPreferencesUpdate,
    UserResponse,
)
from app.security import hash_password, verify_password
from app.settings_service import (
    get_app_settings,
    get_default_prompt_visibility,
    get_public_settings,
    normalize_preferences,
    set_allow_registration,
    set_default_prompt_visibility,
)

router = APIRouter(prefix="/settings", tags=["settings"])


def to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        is_active=user.is_active,
        is_admin=user.is_admin,
        preferences=normalize_preferences(user.preferences),
        created_at=user.created_at,
    )


@router.get("/public", response_model=PublicSettingsResponse)
async def public_settings(db: AsyncSession = Depends(get_db)) -> PublicSettingsResponse:
    data = await get_public_settings(db)
    return PublicSettingsResponse(allow_registration=data["allow_registration"])


@router.get("", response_model=SettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SettingsResponse:
    prefs = UserPreferences(**normalize_preferences(current_user.preferences))
    default_visibility = await get_default_prompt_visibility(db)
    app = None
    if current_user.is_admin:
        app_data = await get_app_settings(db)
        app = AppSettingsResponse(
            allow_registration=app_data["allow_registration"],
            default_prompt_visibility=PromptVisibility(app_data["default_prompt_visibility"]),
            environment=app_data["environment"],
        )
    return SettingsResponse(
        preferences=prefs,
        default_prompt_visibility=default_visibility,
        app=app,
    )


@router.patch("/preferences", response_model=UserPreferences)
async def update_preferences(
    payload: UserPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserPreferences:
    prefs = normalize_preferences(current_user.preferences)
    updates = payload.model_dump(exclude_unset=True)
    prefs.update(updates)
    current_user.preferences = prefs
    await db.flush()
    return UserPreferences(**prefs)


@router.patch("/app", response_model=AppSettingsResponse)
async def update_app_settings(
    payload: AppSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> AppSettingsResponse:
    if payload.allow_registration is not None:
        await set_allow_registration(db, payload.allow_registration)
    if payload.default_prompt_visibility is not None:
        await set_default_prompt_visibility(db, payload.default_prompt_visibility)
    app_data = await get_app_settings(db)
    return AppSettingsResponse(
        allow_registration=app_data["allow_registration"],
        default_prompt_visibility=PromptVisibility(app_data["default_prompt_visibility"]),
        environment=app_data["environment"],
    )


@router.post("/password", response_model=UserResponse)
async def change_password(
    payload: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aktuelles Passwort ist falsch")
    current_user.hashed_password = hash_password(payload.new_password)
    await db.flush()
    return to_user_response(current_user)
