# @file credit.py
# @summary クレジットエンティティ
# @responsibility 未配分クレジット（円建て）を管理

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from .base import Base


class Credit(Base):
    """未配分クレジットテーブル

    購入済みだがまだモデルに配分されていないクレジット（円建て）を管理。
    """
    __tablename__ = 'credits'

    user_id = Column(String, ForeignKey('users.user_id'), primary_key=True)
    credits = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
