# @file auth.py
# @summary 認証関連モデル
# @responsibility トークンブラックリスト等の認証状態を管理

from datetime import datetime

from sqlalchemy import Column, DateTime, Index, Integer, String

from .base import Base


class TokenBlacklist(Base):
    """トークンブラックリストテーブル

    ログアウト時に無効化されたトークンを管理。
    JWTの有効期限が切れたら自動削除可能（定期バッチ or expires_at でフィルタ）。
    """
    __tablename__ = 'token_blacklist'

    id = Column(Integer, primary_key=True, autoincrement=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)  # SHA-256ハッシュ
    expires_at = Column(DateTime, nullable=False, index=True)  # トークンの有効期限
    created_at = Column(DateTime, default=datetime.now, nullable=False)

    # 複合インデックス（expires_atでのクリーンアップ用）
    __table_args__ = (
        Index('idx_token_blacklist_expires', 'expires_at'),
    )
