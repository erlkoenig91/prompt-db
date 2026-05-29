from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.rate_limit import get_client_ip
from app.schemas import RefreshRequest, TokenResponse, UserCreate, UserLogin, UserResponse
from app.security import (
    authenticate_user,
    decode_refresh_token,
    get_user_by_id,
    get_user_by_username,
    hash_password,
    issue_token_pair,
    rotate_refresh_token,
)
from app.settings_service import get_allow_registration, normalize_preferences

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()
limiter = Limiter(key_func=get_client_ip)


def to_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        is_active=user.is_active,
        is_admin=user.is_admin,
        preferences=normalize_preferences(user.preferences),
        created_at=user.created_at,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, payload: UserCreate, db: AsyncSession = Depends(get_db)) -> User:
    if not await get_allow_registration(db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Registrierung deaktiviert")

    existing = await get_user_by_username(db, payload.username)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Benutzername bereits vergeben")

    admin_count = await db.scalar(select(func.count()).select_from(User).where(User.is_admin.is_(True)))
    user = User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        is_admin=(admin_count or 0) == 0,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: UserLogin, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user = await authenticate_user(db, payload.username, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ungültige Anmeldedaten")
    access_token, refresh_token = await issue_token_pair(db, user.id)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=TokenResponse)
@limiter.limit("20/minute")
async def refresh(request: Request, payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    try:
        user_id, jti = decode_refresh_token(payload.refresh_token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ungültiger Refresh-Token") from exc

    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Benutzer nicht gefunden")

    try:
        access_token, refresh_token = await rotate_refresh_token(db, user.id, jti)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Ungültiger Refresh-Token") from exc

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.get("/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return to_user_response(current_user)
