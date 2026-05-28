from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_user, get_optional_user
from app.models import Prompt, PromptVisibility, User
from app.schemas import PromptCreate, PromptResponse, PromptUpdate

router = APIRouter(prefix="/prompts", tags=["prompts"])


def to_prompt_response(prompt: Prompt) -> PromptResponse:
    return PromptResponse(
        id=prompt.id,
        title=prompt.title,
        content=prompt.content,
        description=prompt.description,
        model=prompt.model,
        task=prompt.task,
        visibility=prompt.visibility,
        tags=prompt.tags,
        owner_id=prompt.owner_id,
        owner_username=prompt.owner.username if prompt.owner else None,
        created_at=prompt.created_at,
        updated_at=prompt.updated_at,
    )


@router.get("", response_model=list[PromptResponse])
async def list_prompts(
    scope: str = Query(default="all", pattern="^(all|mine|public)$"),
    search: str | None = Query(default=None, max_length=200),
    task: str | None = Query(default=None, max_length=64),
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> list[PromptResponse]:
    query = select(Prompt).options(selectinload(Prompt.owner))

    if scope == "mine":
        if not current_user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Anmeldung erforderlich")
        query = query.where(Prompt.owner_id == current_user.id)
    elif scope == "public":
        query = query.where(Prompt.visibility == PromptVisibility.PUBLIC)
    else:
        if current_user:
            query = query.where(
                or_(
                    Prompt.visibility == PromptVisibility.PUBLIC,
                    Prompt.owner_id == current_user.id,
                )
            )
        else:
            query = query.where(Prompt.visibility == PromptVisibility.PUBLIC)

    if task:
        query = query.where(Prompt.task == task)

    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                Prompt.title.ilike(pattern),
                Prompt.content.ilike(pattern),
                Prompt.description.ilike(pattern),
                Prompt.tags.ilike(pattern),
                Prompt.model.ilike(pattern),
                Prompt.task.ilike(pattern),
            )
        )

    query = query.order_by(Prompt.updated_at.desc())
    result = await db.execute(query)
    prompts = result.scalars().unique().all()
    return [to_prompt_response(p) for p in prompts]


@router.post("", response_model=PromptResponse, status_code=status.HTTP_201_CREATED)
async def create_prompt(
    payload: PromptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PromptResponse:
    prompt = Prompt(**payload.model_dump(), owner_id=current_user.id)
    db.add(prompt)
    await db.flush()
    result = await db.execute(
        select(Prompt).options(selectinload(Prompt.owner)).where(Prompt.id == prompt.id)
    )
    prompt = result.scalar_one()
    return to_prompt_response(prompt)


@router.get("/{prompt_id}", response_model=PromptResponse)
async def get_prompt(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
) -> PromptResponse:
    result = await db.execute(select(Prompt).join(Prompt.owner).where(Prompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt nicht gefunden")

    is_owner = current_user and prompt.owner_id == current_user.id
    if prompt.visibility != PromptVisibility.PUBLIC and not is_owner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt nicht gefunden")

    return to_prompt_response(prompt)


@router.patch("/{prompt_id}", response_model=PromptResponse)
async def update_prompt(
    prompt_id: UUID,
    payload: PromptUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PromptResponse:
    result = await db.execute(select(Prompt).join(Prompt.owner).where(Prompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt nicht gefunden")
    if prompt.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt nicht gefunden")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(prompt, key, value)

    await db.flush()
    await db.refresh(prompt)
    return to_prompt_response(prompt)


@router.delete("/{prompt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    result = await db.execute(select(Prompt).where(Prompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt nicht gefunden")
    if prompt.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt nicht gefunden")
    db.delete(prompt)
