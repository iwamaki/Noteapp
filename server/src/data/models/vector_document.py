"""Vector Document Model for RAG

pgvectorを使用したベクトルドキュメント管理。
一時データ（Web検索）と永続データ（ユーザー知識ベース）を統一管理。
"""
from datetime import UTC, datetime
from typing import Any, Literal

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base

# Collection type alias
CollectionType = Literal["temp", "persistent"]


class VectorDocument(Base):
    """ベクトルドキュメントモデル

    RAG機能のためのドキュメントとベクトル埋め込みを管理。

    Attributes:
        id: 主キー
        user_id: ユーザーID（一時データはNULL許可）
        collection_name: コレクション名
        collection_type: コレクションタイプ（'temp' | 'persistent'）
        content: ドキュメント本文
        embedding: ベクトル埋め込み（768次元）
        metadata: メタデータ（URL、タイトル等）
        created_at: 作成日時
        expires_at: 有効期限（NULLは永続）
    """

    __tablename__ = "vector_documents"

    # 主キー
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 識別子
    user_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=True,  # 一時データはNULL許可
        index=True
    )
    collection_name: Mapped[str] = mapped_column(String, nullable=False, index=True)

    # データ種別
    collection_type: Mapped[str] = mapped_column(
        String,
        nullable=False,
        default="temp"
    )

    # コンテンツ
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # embedding は pgvector の VECTOR 型を使用（マイグレーションで定義）
    # SQLAlchemy では直接定義せず、生SQLでハンドリング

    # メタデータ
    metadata_: Mapped[dict[str, Any] | None] = mapped_column(
        "metadata",  # DB上のカラム名
        JSONB,
        nullable=True,
        default=dict
    )

    # タイムスタンプ
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC)
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True  # NULLは永続
    )

    # リレーション（オプション）
    # user = relationship("User", back_populates="vector_documents")

    # テーブルレベル制約
    __table_args__ = (
        # collection_type制約
        CheckConstraint(
            "collection_type IN ('temp', 'persistent')",
            name="chk_collection_type"
        ),
        # persistent は user_id 必須
        CheckConstraint(
            "collection_type = 'temp' OR user_id IS NOT NULL",
            name="chk_persistent_requires_user"
        ),
        # インデックス（user_id + collection_name）
        Index(
            "idx_vector_docs_user_collection",
            "user_id",
            "collection_name"
        ),
        # expires_at のインデックス（TTL管理用）
        Index(
            "idx_vector_docs_expires",
            "expires_at",
            postgresql_where="expires_at IS NOT NULL"
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<VectorDocument(id={self.id}, "
            f"collection={self.collection_name}, "
            f"type={self.collection_type}, "
            f"user_id={self.user_id})>"
        )

    @property
    def is_expired(self) -> bool:
        """有効期限切れかどうか"""
        if self.expires_at is None:
            return False
        return datetime.now(UTC) > self.expires_at

    @property
    def is_temporary(self) -> bool:
        """一時データかどうか"""
        return self.collection_type == "temp"
