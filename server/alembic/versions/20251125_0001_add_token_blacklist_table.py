"""Add token_blacklist table for multi-instance support

Revision ID: a1b2c3d4e5f6
Revises: 81ca7c6dcdcc
Create Date: 2025-11-25 00:01:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: str | None = '81ca7c6dcdcc'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Add token_blacklist table for logout token management.

    This table allows multi-instance deployments to share
    blacklisted tokens without requiring Redis.
    """
    op.create_table('token_blacklist',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('token_hash', sa.String(64), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    # Index on token_hash for fast lookup
    op.create_index(
        'ix_token_blacklist_token_hash',
        'token_blacklist',
        ['token_hash'],
        unique=True
    )
    # Index on expires_at for cleanup queries
    op.create_index(
        'idx_token_blacklist_expires',
        'token_blacklist',
        ['expires_at'],
        unique=False
    )


def downgrade() -> None:
    """Remove token_blacklist table"""
    op.drop_index('idx_token_blacklist_expires', table_name='token_blacklist')
    op.drop_index('ix_token_blacklist_token_hash', table_name='token_blacklist')
    op.drop_table('token_blacklist')
