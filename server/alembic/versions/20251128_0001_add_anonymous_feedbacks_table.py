"""Add anonymous_feedbacks table for unauthenticated feedback

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
Create Date: 2025-11-28

匿名フィードバック用テーブルを追加。
- ログイン不要でフィードバック送信可能
- LLM機能オフ時のストア審査用ビルドで使用
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f6g7h8i9j0k1'
down_revision: str | None = 'e5f6g7h8i9j0'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Add anonymous_feedbacks table for unauthenticated feedback collection.

    This table stores anonymous feedback (bug reports, feature requests, etc.)
    without requiring user login. Used for store review builds with LLM features disabled.
    """
    op.create_table('anonymous_feedbacks',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('category', sa.String(), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=True),
        sa.Column('app_version', sa.String(), nullable=True),
        sa.Column('platform', sa.String(), nullable=True),
        sa.Column('device_id', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    # Index on category for filtering by feedback type
    op.create_index('ix_anonymous_feedbacks_category', 'anonymous_feedbacks', ['category'], unique=False)
    # Index on device_id for device-specific queries
    op.create_index('ix_anonymous_feedbacks_device_id', 'anonymous_feedbacks', ['device_id'], unique=False)
    # Index on created_at for time-based queries
    op.create_index('ix_anonymous_feedbacks_created_at', 'anonymous_feedbacks', ['created_at'], unique=False)


def downgrade() -> None:
    """Remove anonymous_feedbacks table"""
    op.drop_index('ix_anonymous_feedbacks_created_at', table_name='anonymous_feedbacks')
    op.drop_index('ix_anonymous_feedbacks_device_id', table_name='anonymous_feedbacks')
    op.drop_index('ix_anonymous_feedbacks_category', table_name='anonymous_feedbacks')
    op.drop_table('anonymous_feedbacks')
