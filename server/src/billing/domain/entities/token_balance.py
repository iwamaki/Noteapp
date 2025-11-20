# @file token_balance.py
# @summary トークン残高エンティティ
# @responsibility モデルごとのトークン残高を管理

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from .base import Base


class TokenBalance(Base):
    """トークン残高テーブル

    モデルごとのトークン残高を管理。
    例: "gemini-2.5-flash" に 100,000 トークン配分済み
    """
    __tablename__ = 'token_balances'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False, index=True)
    model_id = Column(String, nullable=False, index=True)
    allocated_tokens = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # 複合ユニークインデックス（user_id + model_id）
    __table_args__ = (
        {'sqlite_autoincrement': True},
    )
