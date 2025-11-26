"""Add collection_sharing table for collection access control

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2025-11-26

コレクション共有機能のためのテーブルを追加。
- persistentコレクションを他ユーザーと共有
- 読み取り権限のみ（検索・閲覧）
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e5f6g7h8i9j0'
down_revision: str | None = 'd4e5f6g7h8i9'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # collection_sharingテーブル作成
    op.create_table(
        'collection_sharing',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('owner_user_id', sa.String(), nullable=False),
        sa.Column('collection_name', sa.String(), nullable=False),
        sa.Column('shared_with_user_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('NOW()')),

        # 主キー
        sa.PrimaryKeyConstraint('id'),

        # 外部キー制約
        sa.ForeignKeyConstraint(
            ['owner_user_id'], ['users.user_id'],
            ondelete='CASCADE'
        ),
        sa.ForeignKeyConstraint(
            ['shared_with_user_id'], ['users.user_id'],
            ondelete='CASCADE'
        ),

        # ユニーク制約（同じコレクションを同じユーザーに重複共有防止）
        sa.UniqueConstraint(
            'owner_user_id', 'collection_name', 'shared_with_user_id',
            name='uq_sharing_unique'
        ),

        # 自己共有禁止
        sa.CheckConstraint(
            'owner_user_id != shared_with_user_id',
            name='chk_no_self_sharing'
        ),
    )

    # インデックス作成
    op.create_index(
        'idx_sharing_owner_collection',
        'collection_sharing',
        ['owner_user_id', 'collection_name']
    )
    op.create_index(
        'idx_sharing_shared_with',
        'collection_sharing',
        ['shared_with_user_id']
    )
    op.create_index(
        'idx_sharing_collection',
        'collection_sharing',
        ['collection_name']
    )


def downgrade() -> None:
    op.drop_index('idx_sharing_collection', table_name='collection_sharing')
    op.drop_index('idx_sharing_shared_with', table_name='collection_sharing')
    op.drop_index('idx_sharing_owner_collection', table_name='collection_sharing')
    op.drop_table('collection_sharing')
