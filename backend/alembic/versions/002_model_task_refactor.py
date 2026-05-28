"""model and task refactor

Revision ID: 002
Revises: 001
Create Date: 2026-05-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE prompts
        ALTER COLUMN model TYPE VARCHAR(128)
        USING (
            CASE
                WHEN model::text = 'custom' THEN COALESCE(custom_model, 'custom')
                ELSE model::text
            END
        )
        """
    )
    op.drop_column("prompts", "custom_model")

    op.add_column("prompts", sa.Column("task", sa.String(length=64), nullable=True))
    op.execute(
        """
        UPDATE prompts SET task = CASE prompt_type::text
            WHEN 'system' THEN 'planning'
            WHEN 'user' THEN 'other'
            WHEN 'assistant' THEN 'other'
            WHEN 'template' THEN 'documentation'
            WHEN 'few-shot' THEN 'testing'
            WHEN 'chain' THEN 'architecture'
            ELSE 'other'
        END
        """
    )
    op.alter_column("prompts", "task", nullable=False)
    op.drop_column("prompts", "prompt_type")

    op.execute("DROP TYPE IF EXISTS prompt_model")
    op.execute("DROP TYPE IF EXISTS prompt_type")


def downgrade() -> None:
    prompt_model = sa.Enum(
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "claude-3-5-sonnet",
        "claude-3-opus",
        "gemini-2-flash",
        "llama-3-70b",
        "custom",
        name="prompt_model",
    )
    prompt_type = sa.Enum(
        "system",
        "user",
        "assistant",
        "template",
        "few-shot",
        "chain",
        name="prompt_type",
    )
    bind = op.get_bind()
    prompt_model.create(bind, checkfirst=True)
    prompt_type.create(bind, checkfirst=True)

    op.add_column("prompts", sa.Column("custom_model", sa.String(length=128), nullable=True))
    op.add_column("prompts", sa.Column("prompt_type", prompt_type, nullable=True))

    op.execute(
        """
        UPDATE prompts SET
            custom_model = CASE WHEN model NOT IN (
                'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'claude-3-5-sonnet',
                'claude-3-opus', 'gemini-2-flash', 'llama-3-70b'
            ) THEN model ELSE NULL END,
            prompt_type = 'other'::prompt_type
        """
    )
    op.execute(
        """
        UPDATE prompts SET model = 'custom'
        WHERE custom_model IS NOT NULL
        """
    )
    op.execute(
        """
        UPDATE prompts SET model = model::prompt_model
        WHERE custom_model IS NULL
        """
    )

    op.alter_column("prompts", "prompt_type", nullable=False)
    op.drop_column("prompts", "task")
