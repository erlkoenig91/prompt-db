from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_user
from app.models import Prompt, PromptVisibility, User
from app.schemas import NewPromptsPoint, StatsResponse, TopCopiedPrompt

router = APIRouter(prefix="/stats", tags=["stats"])

_TIMELINE_DAYS = 30
_TOP_LIMIT = 10


@router.get("", response_model=StatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> StatsResponse:
    public = Prompt.visibility == PromptVisibility.PUBLIC
    now = datetime.now(timezone.utc)
    since_7 = now - timedelta(days=7)
    since_30 = now - timedelta(days=_TIMELINE_DAYS)

    total_public = await db.scalar(select(func.count()).select_from(Prompt).where(public))
    total_copies = await db.scalar(
        select(func.coalesce(func.sum(Prompt.copy_count), 0)).where(public)
    )
    new_7 = await db.scalar(
        select(func.count()).select_from(Prompt).where(public, Prompt.created_at >= since_7)
    )
    new_30 = await db.scalar(
        select(func.count()).select_from(Prompt).where(public, Prompt.created_at >= since_30)
    )

    top_result = await db.execute(
        select(Prompt)
        .options(selectinload(Prompt.owner))
        .where(public)
        .order_by(Prompt.copy_count.desc(), Prompt.updated_at.desc())
        .limit(_TOP_LIMIT)
    )
    most_copied = [
        TopCopiedPrompt(
            id=p.id,
            title=p.title,
            model=p.model,
            task=p.task,
            owner_username=p.owner.username if p.owner else None,
            copy_count=p.copy_count,
            created_at=p.created_at,
        )
        for p in top_result.scalars().all()
    ]

    day = func.date_trunc("day", Prompt.created_at)
    timeline_result = await db.execute(
        select(day.label("day"), func.count().label("count"))
        .where(public, Prompt.created_at >= since_30)
        .group_by(day)
        .order_by(day)
    )
    counts_by_day = {row.day.date(): row.count for row in timeline_result.all()}

    start_date = (now - timedelta(days=_TIMELINE_DAYS - 1)).date()
    new_prompts_by_day = [
        NewPromptsPoint(
            date=(start_date + timedelta(days=offset)).isoformat(),
            count=counts_by_day.get(start_date + timedelta(days=offset), 0),
        )
        for offset in range(_TIMELINE_DAYS)
    ]

    return StatsResponse(
        total_public_prompts=total_public or 0,
        total_copies=total_copies or 0,
        new_last_7_days=new_7 or 0,
        new_last_30_days=new_30 or 0,
        most_copied=most_copied,
        new_prompts_by_day=new_prompts_by_day,
    )
