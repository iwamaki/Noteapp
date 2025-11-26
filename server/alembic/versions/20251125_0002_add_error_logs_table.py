"""Add error_logs table for client error tracking

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2025-11-25 00:02:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: str | None = 'a1b2c3d4e5f6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Add error_logs table for client error tracking.

    This table stores errors from frontend apps,
    linked to users for support and debugging.
    """
    op.create_table('error_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('device_id', sa.String(), nullable=True),
        sa.Column('level', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('stack_trace', sa.Text(), nullable=True),
        sa.Column('additional_data', sa.Text(), nullable=True),
        sa.Column('app_version', sa.String(), nullable=True),
        sa.Column('platform', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    # Index on user_id for user-specific queries
    op.create_index('ix_error_logs_user_id', 'error_logs', ['user_id'], unique=False)
    # Index on device_id for device-specific queries
    op.create_index('ix_error_logs_device_id', 'error_logs', ['device_id'], unique=False)
    # Index on category for filtering by error type
    op.create_index('ix_error_logs_category', 'error_logs', ['category'], unique=False)
    # Index on created_at for time-based queries and cleanup
    op.create_index('ix_error_logs_created_at', 'error_logs', ['created_at'], unique=False)


def downgrade() -> None:
    """Remove error_logs table"""
    op.drop_index('ix_error_logs_created_at', table_name='error_logs')
    op.drop_index('ix_error_logs_category', table_name='error_logs')
    op.drop_index('ix_error_logs_device_id', table_name='error_logs')
    op.drop_index('ix_error_logs_user_id', table_name='error_logs')
    op.drop_table('error_logs')
