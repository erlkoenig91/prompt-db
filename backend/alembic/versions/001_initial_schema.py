"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-27
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    prompt_model = postgresql.ENUM(
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
        "claude-3-5-sonnet",
        "claude-3-opus",
        "gemini-2-flash",
        "llama-3-70b",
        "custom",
        name="prompt_model",
        create_type=False,
    )
    prompt_type = postgresql.ENUM(
        "system",
        "user",
        "assistant",
        "template",
        "few-shot",
        "chain",
        name="prompt_type",
        create_type=False,
    )
    prompt_visibility = postgresql.ENUM("private", "public", name="prompt_visibility", create_type=False)

    bind = op.get_bind()
    prompt_model.create(bind, checkfirst=True)
    prompt_type.create(bind, checkfirst=True)
    prompt_visibility.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=64), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.create_table(
        "prompts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("model", prompt_model, nullable=False),
        sa.Column("custom_model", sa.String(length=128), nullable=True),
        sa.Column("prompt_type", prompt_type, nullable=False),
        sa.Column("visibility", prompt_visibility, nullable=False),
        sa.Column("tags", sa.String(length=500), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_prompts_owner_id"), "prompts", ["owner_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_prompts_owner_id"), table_name="prompts")
    op.drop_table("prompts")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS prompt_visibility")
    op.execute("DROP TYPE IF EXISTS prompt_type")
    op.execute("DROP TYPE IF EXISTS prompt_model")
