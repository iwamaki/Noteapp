"""Add feedbacks table for user feedback

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6a7
Create Date: 2025-11-25 00:03:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: str | None = 'b2c3d4e5f6a7'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Add feedbacks table for user feedback collection.

    This table stores user feedback (bug reports, feature requests, etc.)
    linked to users for product improvement.
    """
    op.create_table('feedbacks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('app_version', sa.String(), nullable=True),
        sa.Column('platform', sa.String(), nullable=True),
        sa.Column('device_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    # Index on user_id for user-specific queries
    op.create_index('ix_feedbacks_user_id', 'feedbacks', ['user_id'], unique=False)
    # Index on category for filtering by feedback type
    op.create_index('ix_feedbacks_category', 'feedbacks', ['category'], unique=False)
    # Index on device_id for device-specific queries
    op.create_index('ix_feedbacks_device_id', 'feedbacks', ['device_id'], unique=False)
    # Index on created_at for time-based queries
    op.create_index('ix_feedbacks_created_at', 'feedbacks', ['created_at'], unique=False)


def downgrade() -> None:
    """Remove feedbacks table"""
    op.drop_index('ix_feedbacks_created_at', table_name='feedbacks')
    op.drop_index('ix_feedbacks_device_id', table_name='feedbacks')
    op.drop_index('ix_feedbacks_category', table_name='feedbacks')
    op.drop_index('ix_feedbacks_user_id', table_name='feedbacks')
    op.drop_table('feedbacks')
