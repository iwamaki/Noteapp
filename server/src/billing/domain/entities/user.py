# @file user.py
# @summary ユーザーエンティティ
# @responsibility ユーザーの基本情報を表現

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from .base import Base


class User(Base):
    """ユーザーテーブル

    ユーザー管理テーブル。デバイスID認証とGoogle OAuth2認証に対応。
    """
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.now)

    # Google OAuth2 認証情報
    google_id = Column(String, unique=True, nullable=True, index=True)
    email = Column(String, unique=True, nullable=True, index=True)
    display_name = Column(String, nullable=True)
    profile_picture_url = Column(String, nullable=True)
