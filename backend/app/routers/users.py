from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import get_admin_user
from app.models import Prompt, User
from app.schemas import AdminPasswordReset, UserAdminResponse, UserAdminUpdate
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


async def _count_admins(db: AsyncSession) -> int:
    result = await db.scalar(select(func.count()).select_from(User).where(User.is_admin.is_(True)))
    return result or 0


@router.get("", response_model=list[UserAdminResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> list[UserAdminResponse]:
    result = await db.execute(select(User).order_by(User.created_at.asc()))
    users = result.scalars().all()
    responses: list[UserAdminResponse] = []
    for user in users:
        prompt_count = await db.scalar(
            select(func.count()).select_from(Prompt).where(Prompt.owner_id == user.id)
        )
        responses.append(
            UserAdminResponse(
                id=user.id,
                username=user.username,
                is_active=user.is_active,
                is_admin=user.is_admin,
                created_at=user.created_at,
                prompt_count=prompt_count or 0,
            )
        )
    return responses


@router.patch("/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: UUID,
    payload: UserAdminUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> UserAdminResponse:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benutzer nicht gefunden")

    updates = payload.model_dump(exclude_unset=True)

    if updates.get("is_admin") is False and user.is_admin:
        if user.id == current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Eigene Administratorrechte können nicht entzogen werden",
            )
        if await _count_admins(db) <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Der letzte Administrator kann nicht entfernt werden",
            )

    if updates.get("is_active") is False and user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Das eigene Konto kann nicht deaktiviert werden",
        )

    for key, value in updates.items():
        setattr(user, key, value)

    await db.flush()

    prompt_count = await db.scalar(select(func.count()).select_from(Prompt).where(Prompt.owner_id == user.id))
    return UserAdminResponse(
        id=user.id,
        username=user.username,
        is_active=user.is_active,
        is_admin=user.is_admin,
        created_at=user.created_at,
        prompt_count=prompt_count or 0,
    )


@router.post("/{user_id}/password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_user_password(
    user_id: UUID,
    payload: AdminPasswordReset,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benutzer nicht gefunden")
    user.hashed_password = hash_password(payload.new_password)
    await db.flush()


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_admin_user),
) -> None:
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Das eigene Konto kann nicht gelöscht werden",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benutzer nicht gefunden")

    if user.is_admin and await _count_admins(db) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Der letzte Administrator kann nicht gelöscht werden",
        )

    await db.delete(user)
