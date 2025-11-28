"""Make error_logs.user_id nullable for anonymous error logging

Revision ID: g7h8i9j0k1l2
Revises: f6g7h8i9j0k1
Create Date: 2025-11-28

error_logsテーブルのuser_idをnullableに変更。
- 認証なしでもエラーログを送信可能に
- LLM機能オフ時のストア審査用ビルドで使用
- 認証がある場合はuser_idが紐付けられる
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'g7h8i9j0k1l2'
down_revision: str | None = 'f6g7h8i9j0k1'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """
    Make user_id nullable in error_logs table.

    This allows error logging without authentication.
    When authenticated, user_id is set; when anonymous, it's NULL.
    """
    # PostgreSQLではALTER COLUMN ... DROP NOT NULLを使用
    op.alter_column('error_logs', 'user_id',
        existing_type=sa.String(),
        nullable=True
    )


def downgrade() -> None:
    """Revert user_id to non-nullable (requires data cleanup first)"""
    # 注意: NULLのレコードがある場合は先に削除またはデフォルト値設定が必要
    op.execute("DELETE FROM error_logs WHERE user_id IS NULL")
    op.alter_column('error_logs', 'user_id',
        existing_type=sa.String(),
        nullable=False
    )
