"""Add vector_documents table for RAG with pgvector

Revision ID: a1b2c3d4e5f6
Revises: 20251125_0003_add_feedbacks_table
Create Date: 2025-11-26

pgvectorを使用したベクトルドキュメント管理テーブルを追加。
- 一時データ（Web検索結果）: user_id=NULL, TTL付き
- 永続データ（ユーザー知識ベース）: user_id必須
"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd4e5f6g7h8i9'
down_revision: str | None = 'c3d4e5f6g7h8'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # pgvector拡張を有効化
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # vector_documentsテーブル作成
    op.create_table(
        'vector_documents',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('collection_name', sa.String(), nullable=False),
        sa.Column('collection_type', sa.String(), nullable=False, server_default='temp'),
        sa.Column('content', sa.Text(), nullable=False),
        # embedding列はop.executeで追加（pgvector型）
        sa.Column('metadata', JSONB(), nullable=True, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text('NOW()')),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint(
            "collection_type IN ('temp', 'persistent')",
            name='chk_collection_type'
        ),
        sa.CheckConstraint(
            "collection_type = 'temp' OR user_id IS NOT NULL",
            name='chk_persistent_requires_user'
        ),
    )

    # embedding列を追加（vector(768)型）
    op.execute(
        "ALTER TABLE vector_documents ADD COLUMN embedding vector(768) NOT NULL"
    )

    # インデックス作成
    op.create_index(
        'idx_vector_docs_user_id',
        'vector_documents',
        ['user_id']
    )
    op.create_index(
        'idx_vector_docs_collection_name',
        'vector_documents',
        ['collection_name']
    )
    op.create_index(
        'idx_vector_docs_user_collection',
        'vector_documents',
        ['user_id', 'collection_name']
    )

    # expires_atのパーシャルインデックス（TTL管理用）
    op.execute("""
        CREATE INDEX idx_vector_docs_expires
        ON vector_documents (expires_at)
        WHERE expires_at IS NOT NULL
    """)

    # HNSWインデックス（ベクトル検索用）
    # cosine距離を使用
    op.execute("""
        CREATE INDEX idx_vector_docs_embedding
        ON vector_documents
        USING hnsw (embedding vector_cosine_ops)
    """)


def downgrade() -> None:
    # インデックス削除
    op.execute("DROP INDEX IF EXISTS idx_vector_docs_embedding")
    op.execute("DROP INDEX IF EXISTS idx_vector_docs_expires")
    op.drop_index('idx_vector_docs_user_collection', table_name='vector_documents')
    op.drop_index('idx_vector_docs_collection_name', table_name='vector_documents')
    op.drop_index('idx_vector_docs_user_id', table_name='vector_documents')

    # テーブル削除
    op.drop_table('vector_documents')

    # 注意: pgvector拡張は他で使用している可能性があるため削除しない
    # op.execute("DROP EXTENSION IF EXISTS vector")
