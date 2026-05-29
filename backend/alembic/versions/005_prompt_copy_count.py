"""prompt copy counter

Revision ID: 005
Revises: 004
Create Date: 2026-05-29
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "prompts",
        sa.Column("copy_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_index(op.f("ix_prompts_copy_count"), "prompts", ["copy_count"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_prompts_copy_count"), table_name="prompts")
    op.drop_column("prompts", "copy_count")
