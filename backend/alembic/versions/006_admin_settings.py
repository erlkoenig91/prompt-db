"""admin role, user preferences, app settings

Revision ID: 006
Revises: 005
Create Date: 2026-05-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "006"
down_revision: Union[str, None] = "005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), server_default="false", nullable=False),
    )
    op.add_column(
        "users",
        sa.Column("preferences", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )

    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )

    op.execute(
        """
        UPDATE users
        SET is_admin = true
        WHERE id = (
            SELECT id FROM users
            WHERE is_active = true
            ORDER BY created_at ASC
            LIMIT 1
        )
        """
    )

    op.execute(
        """
        INSERT INTO app_settings (key, value)
        VALUES ('default_prompt_visibility', 'private')
        ON CONFLICT (key) DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_table("app_settings")
    op.drop_column("users", "preferences")
    op.drop_column("users", "is_admin")
