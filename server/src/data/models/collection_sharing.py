"""Collection Sharing Model

コレクション共有機能のためのモデル。
persistentコレクションを他ユーザーと共有するための関係を管理。
"""
from datetime import UTC, datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class CollectionSharing(Base):
    """コレクション共有モデル

    Attributes:
        id: 主キー
        owner_user_id: コレクション所有者のユーザーID
        collection_name: 共有するコレクション名
        shared_with_user_id: 共有先ユーザーID
        created_at: 共有作成日時
    """

    __tablename__ = "collection_sharing"

    # 主キー
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # 共有元（所有者）
    owner_user_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    collection_name: Mapped[str] = mapped_column(String, nullable=False, index=True)

    # 共有先
    shared_with_user_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("users.user_id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # タイムスタンプ
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC)
    )

    # テーブルレベル制約
    __table_args__ = (
        # 複合ユニーク制約（同じコレクションを同じユーザーに重複共有防止）
        UniqueConstraint(
            "owner_user_id",
            "collection_name",
            "shared_with_user_id",
            name="uq_sharing_unique"
        ),
        # 自分自身への共有禁止
        CheckConstraint(
            "owner_user_id != shared_with_user_id",
            name="chk_no_self_sharing"
        ),
        # 複合インデックス（所有者+コレクション名）
        Index(
            "idx_sharing_owner_collection",
            "owner_user_id",
            "collection_name"
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<CollectionSharing("
            f"owner={self.owner_user_id}, "
            f"collection={self.collection_name}, "
            f"shared_with={self.shared_with_user_id})>"
        )
