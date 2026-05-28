import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import RefreshToken, User

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"
TOKEN_TYPE_ACCESS = "access"
TOKEN_TYPE_REFRESH = "refresh"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(user_id: uuid.UUID) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "exp": expire, "type": TOKEN_TYPE_ACCESS}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(user_id: uuid.UUID) -> tuple[str, uuid.UUID, datetime]:
    jti = uuid.uuid4()
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    payload = {
        "sub": str(user_id),
        "exp": expires_at,
        "type": TOKEN_TYPE_REFRESH,
        "jti": str(jti),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)
    return token, jti, expires_at


def decode_access_token(token: str) -> uuid.UUID:
    try:
        payload: dict[str, Any] = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        if payload.get("type") != TOKEN_TYPE_ACCESS:
            raise JWTError("Invalid token type")
        user_id = payload.get("sub")
        if not user_id:
            raise JWTError("Missing subject")
        return uuid.UUID(user_id)
    except (JWTError, ValueError) as exc:
        raise JWTError("Invalid token") from exc


def decode_refresh_token(token: str) -> tuple[uuid.UUID, uuid.UUID]:
    try:
        payload: dict[str, Any] = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        if payload.get("type") != TOKEN_TYPE_REFRESH:
            raise JWTError("Invalid token type")
        user_id = payload.get("sub")
        jti = payload.get("jti")
        if not user_id or not jti:
            raise JWTError("Missing token claims")
        return uuid.UUID(user_id), uuid.UUID(jti)
    except (JWTError, ValueError) as exc:
        raise JWTError("Invalid token") from exc


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_refresh_token(db: AsyncSession, jti: uuid.UUID) -> RefreshToken | None:
    result = await db.execute(select(RefreshToken).where(RefreshToken.id == jti))
    return result.scalar_one_or_none()


async def store_refresh_token(
    db: AsyncSession, user_id: uuid.UUID, jti: uuid.UUID, expires_at: datetime
) -> RefreshToken:
    token = RefreshToken(id=jti, user_id=user_id, expires_at=expires_at)
    db.add(token)
    await db.flush()
    return token


async def revoke_refresh_token(db: AsyncSession, token: RefreshToken) -> None:
    token.revoked_at = datetime.now(UTC)


async def issue_token_pair(db: AsyncSession, user_id: uuid.UUID) -> tuple[str, str]:
    access_token = create_access_token(user_id)
    refresh_token, jti, expires_at = create_refresh_token(user_id)
    await store_refresh_token(db, user_id, jti, expires_at)
    return access_token, refresh_token


async def rotate_refresh_token(db: AsyncSession, user_id: uuid.UUID, jti: uuid.UUID) -> tuple[str, str]:
    stored = await get_refresh_token(db, jti)
    now = datetime.now(UTC)
    if (
        stored is None
        or stored.user_id != user_id
        or stored.revoked_at is not None
        or stored.expires_at <= now
    ):
        raise JWTError("Refresh token revoked or expired")

    await revoke_refresh_token(db, stored)
    return await issue_token_pair(db, user_id)


async def authenticate_user(db: AsyncSession, username: str, password: str) -> User | None:
    user = await get_user_by_username(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


# Backwards-compatible alias used by deps.py
decode_token = decode_access_token
