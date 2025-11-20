# @file service.py
# @summary 認証サービス層
# @responsibility デバイスID認証のビジネスロジック

import secrets
import string
from datetime import datetime
from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from jose import jwt
from src.billing.models import User, DeviceAuth, Credit
from src.core.logger import logger
from src.auth.token_blacklist_manager import get_blacklist_manager


class AuthenticationError(Exception):
    """認証エラーの基底クラス"""
    pass


class DeviceNotFoundError(AuthenticationError):
    """デバイスが見つからない"""
    pass


class DeviceAccessDeniedError(AuthenticationError):
    """デバイスへのアクセスが拒否された"""
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
        if device:
            # 最終ログイン日時を更新
            device.last_login_at = datetime.now()
            self.db.commit()
            return device.user_id
        return None

    def verify_device_user(self, device_id: str, client_user_id: str) -> Tuple[bool, str, str]:
        """
        デバイスIDとユーザーIDの対応関係を検証

        クライアント側で保持しているuser_idと、サーバー側のdevice_idに
        紐付いているuser_idが一致しているかを確認する。

        Args:
            device_id: デバイスID
            client_user_id: クライアント側で保持しているユーザーID

        Returns:
            (valid, correct_user_id, message):
                - valid: 対応関係が正しいか
                - correct_user_id: サーバー側の正しいユーザーID
                - message: 結果メッセージ

        Raises:
            DeviceNotFoundError: デバイスが登録されていない場合
        """
        device = self.db.query(DeviceAuth).filter_by(device_id=device_id).first()

        if not device:
            logger.warning(f"Device verification failed: Device not found - {device_id}")
            raise DeviceNotFoundError(f"Device not registered: {device_id}")

        server_user_id = device.user_id
        assert server_user_id is not None, "user_id should not be None"

        # 最終ログイン日時を更新
        device.last_login_at = datetime.now()
        self.db.commit()

        if server_user_id != client_user_id:
            # 不一致の場合
            logger.warning(
                f"User ID mismatch detected - "
                f"device_id: {device_id}, "
                f"client_user_id: {client_user_id}, "
                f"server_user_id: {server_user_id}"
            )
            return False, server_user_id, "User ID mismatch. Please update to the correct user_id."

        # 一致している場合
        logger.info(f"Device verification successful - device_id: {device_id}, user_id: {server_user_id}")
        return True, server_user_id, "Device and user verified successfully"

    def logout(self, access_token: str, refresh_token: str) -> None:
        """
        ログアウト処理

        アクセストークンとリフレッシュトークンをブラックリストに追加し、
        それらのトークンを無効化します。

        Args:
            access_token: 無効化するアクセストークン
            refresh_token: 無効化するリフレッシュトークン

        Raises:
            AuthenticationError: トークンの無効化に失敗した場合
        """
        try:
            blacklist_manager = get_blacklist_manager()

            # トークンの有効期限を取得（署名検証なし）
            access_payload = jwt.decode(access_token, "", options={"verify_signature": False})
            refresh_payload = jwt.decode(refresh_token, "", options={"verify_signature": False})

            # 現在時刻と有効期限の差分を計算（秒）
            current_time = datetime.utcnow().timestamp()
            access_expires_in = max(0, int(access_payload.get("exp", 0) - current_time))
            refresh_expires_in = max(0, int(refresh_payload.get("exp", 0) - current_time))

            # ブラックリストに追加（有効期限が切れるまで保持）
            if access_expires_in > 0:
                blacklist_manager.add_to_blacklist(access_token, access_expires_in)
                logger.debug(f"Access token blacklisted: expires_in={access_expires_in}s")

            if refresh_expires_in > 0:
                blacklist_manager.add_to_blacklist(refresh_token, refresh_expires_in)
                logger.debug(f"Refresh token blacklisted: expires_in={refresh_expires_in}s")

            user_id = access_payload.get("sub")
            device_id = access_payload.get("device_id")

            logger.info(
                "User logged out successfully",
                extra={
                    "user_id": user_id,
                    "device_id": device_id[:20] + "..." if device_id else "unknown"
                }
            )

        except Exception as e:
            logger.error(f"Failed to logout: {e}")
            raise AuthenticationError(f"Logout failed: {e}")

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

    def get_user_devices(self, user_id: str) -> List[DeviceAuth]:
        """
        ユーザーの全デバイスを取得

        Args:
            user_id: ユーザーID

        Returns:
            デバイス認証レコードのリスト

        Raises:
            AuthenticationError: データベースエラーが発生した場合
        """
        try:
            devices = self.db.query(DeviceAuth).filter_by(user_id=user_id).all()
            logger.info(f"Retrieved {len(devices)} devices for user_id={user_id}")
            return devices
        except Exception as e:
            logger.error(f"Failed to get user devices: {e}")
            raise AuthenticationError(f"Failed to get user devices: {e}")

    def delete_device(self, user_id: str, device_id: str) -> None:
        """
        デバイスを削除（論理削除）

        Args:
            user_id: ユーザーID（認可確認用）
            device_id: 削除するデバイスID

        Raises:
            DeviceNotFoundError: デバイスが見つからない場合
            DeviceAccessDeniedError: デバイスが別のユーザーに属している場合
            AuthenticationError: データベースエラーが発生した場合
        """
        try:
            device = self.db.query(DeviceAuth).filter_by(device_id=device_id).first()

            if not device:
                raise DeviceNotFoundError(f"Device not found: {device_id}")

            # ユーザーの所有確認
            if device.user_id != user_id:
                logger.warning(
                    f"Device access denied: user_id={user_id}, "
                    f"device_id={device_id}, owner={device.user_id}"
                )
                raise DeviceAccessDeniedError(
                    "You don't have permission to delete this device"
                )

            # 論理削除
            device.is_active = False
            self.db.commit()

            logger.info(f"Device deleted: user_id={user_id}, device_id={device_id}")

        except (DeviceNotFoundError, DeviceAccessDeniedError):
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to delete device: {e}")
            raise AuthenticationError(f"Failed to delete device: {e}")

    def update_device_info(
        self,
        device_id: str,
        device_name: Optional[str] = None,
        device_type: Optional[str] = None
    ) -> None:
        """
        デバイス情報を更新

        Args:
            device_id: デバイスID
            device_name: デバイス名（Noneの場合は更新しない）
            device_type: デバイスタイプ（Noneの場合は更新しない）

        Raises:
            DeviceNotFoundError: デバイスが見つからない場合
            AuthenticationError: データベースエラーが発生した場合
        """
        try:
            device = self.db.query(DeviceAuth).filter_by(device_id=device_id).first()

            if not device:
                raise DeviceNotFoundError(f"Device not found: {device_id}")

            # 更新
            if device_name is not None:
                device.device_name = device_name
            if device_type is not None:
                device.device_type = device_type

            self.db.commit()

            logger.info(
                f"Device info updated: device_id={device_id}, "
                f"name={device_name}, type={device_type}"
            )

        except DeviceNotFoundError:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Failed to update device info: {e}")
            raise AuthenticationError(f"Failed to update device info: {e}")

