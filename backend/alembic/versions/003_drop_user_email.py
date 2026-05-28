"""drop user email

Revision ID: 003
Revises: 002
Create Date: 2026-05-27
"""

from typing import Sequence, Union

from alembic import op

revision: str = "003"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_column("users", "email")


def downgrade() -> None:
    import sqlalchemy as sa

    op.add_column("users", sa.Column("email", sa.String(length=255), nullable=True))
    op.execute("UPDATE users SET email = username || '@local.invalid'")
    op.alter_column("users", "email", nullable=False)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
