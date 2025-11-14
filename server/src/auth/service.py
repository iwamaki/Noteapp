# @file service.py
# @summary 認証サービス層
# @responsibility デバイスID認証のビジネスロジック

import secrets
import string
from datetime import datetime
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from src.billing.models import User, DeviceAuth, Credit
from src.core.logger import logger


class AuthenticationError(Exception):
    """認証エラーの基底クラス"""
    pass


class DeviceNotFoundError(AuthenticationError):
    """デバイスが見つからない"""
    pass


class AuthService:
    """認証サービスクラス"""

    def __init__(self, db: Session):
        self.db = db

    def register_device(self, device_id: str) -> Tuple[str, bool]:
        """
        デバイスIDを登録し、ユーザーアカウントを作成または取得

        Args:
            device_id: デバイスの一意識別子（UUID）

        Returns:
            (user_id, is_new_user): ユーザーIDと新規作成フラグのタプル
        """
        try:
            # 既存のデバイス認証を確認
            existing_device = self.db.query(DeviceAuth).filter_by(device_id=device_id).first()

            if existing_device:
                # 既存ユーザー: last_login_at を更新
                existing_device.last_login_at = datetime.now()
                self.db.commit()
                user_id = existing_device.user_id
                assert user_id is not None, "user_id should not be None"
                logger.info(f"Device login: device_id={device_id}, user_id={user_id}")
                return user_id, False

            # 新規ユーザー作成
            user_id = self._generate_unique_user_id()

            # ユーザーレコード作成
            new_user = User(user_id=user_id)
            self.db.add(new_user)

            # クレジットレコード作成
            new_credit = Credit(user_id=user_id, credits=0)
            self.db.add(new_credit)

            # デバイス認証レコード作成
            new_device_auth = DeviceAuth(device_id=device_id, user_id=user_id)
            self.db.add(new_device_auth)

            self.db.commit()
            logger.info(f"New device registered: device_id={device_id}, user_id={user_id}")
            return user_id, True

        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to register device: {e}")
            raise AuthenticationError(f"Device registration failed: {e}")


    def get_user_id_by_device(self, device_id: str) -> Optional[str]:
        """
        デバイスIDからユーザーIDを取得

        Args:
            device_id: デバイスID

        Returns:
            ユーザーID（存在しない場合はNone）
        """
        device = self.db.query(DeviceAuth).filter_by(device_id=device_id).first()
        return device.user_id if device else None

    def _generate_unique_user_id(self) -> str:
        """
        一意なユーザーIDを生成

        Returns:
            ユーザーID（例: user_abc123def）
        """
        while True:
            # ランダムな文字列を生成
            random_part = ''.join(secrets.choice(string.ascii_lowercase + string.digits)
                                for _ in range(9))
            user_id = f"user_{random_part}"

            # 既存のユーザーIDと重複していないか確認
            existing = self.db.query(User).filter_by(user_id=user_id).first()
            if not existing:
                return user_id

