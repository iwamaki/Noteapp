"""
@file auth.py
@summary Auth関連のSQLAlchemyモデル定義
@responsibility データベーステーブルのスキーマ定義とORMマッピング

Note:
    UserModel は billing.py で定義されているものを使用します（共通モデル）。
    このファイルでは DeviceModel のみを定義します。
"""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from src.infrastructure.database.base import Base

# UserModel は billing.py で定義されているため、ここでは定義しない
# from src.persistence.models.billing import UserModel を使用


class DeviceModel(Base):
    """デバイス認証テーブル

    デバイスIDとユーザーIDの紐付けを管理。
    マルチデバイス対応: 1ユーザーが複数のデバイスを持つことが可能。
    """
    __tablename__ = 'device_auth'

    id = Column(Integer, primary_key=True, autoincrement=True)
    device_id = Column(String, unique=True, nullable=False, index=True)  # デバイスの一意識別子（UUID）
    user_id = Column(String, ForeignKey('users.user_id'), nullable=False, index=True)
    device_name = Column(String, nullable=True)  # デバイス名（例: "iPhone 14 Pro"）
    device_type = Column(String, nullable=True)  # デバイスタイプ（"ios", "android", "web"）
    is_active = Column(Boolean, default=True, nullable=False)  # アクティブフラグ（論理削除用）
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    last_login_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)
