"""
@file auth_service.py
@summary AuthServiceドメインサービス - 基本認証処理
@responsibility デバイスID認証とユーザー管理のビジネスロジック
"""

import secrets
import string
from typing import Any, Protocol

from src.core.logger import logger

from ..entities.device import Device
from ..entities.user import User
from ..repositories.device_repository import DeviceRepository
from ..repositories.user_repository import UserRepository


class CreditCreator(Protocol):
    """クレジット作成のプロトコル（依存性逆転）"""

    async def create_initial_credits(self, user_id: str) -> None:
        """新規ユーザー用の初期クレジットを作成"""
        ...


class AuthService:
    """基本認証ドメインサービス

    デバイスID認証とユーザー管理の基本的なビジネスロジックを提供する。

    責務:
    - デバイスID認証によるユーザー作成
    - ユーザープロフィール取得
    - ユーザーID生成
    """

    def __init__(
        self,
        user_repo: UserRepository,
        device_repo: DeviceRepository,
        credit_creator: CreditCreator | None = None
    ):
        """初期化

        Args:
            user_repo: ユーザーリポジトリ
            device_repo: デバイスリポジトリ
            credit_creator: クレジット作成サービス（オプショナル）
        """
        self.user_repo = user_repo
        self.device_repo = device_repo
        self.credit_creator = credit_creator

    async def register_device(self, device_id: str) -> dict[str, Any]:
        """デバイスIDを登録し、ユーザーアカウントを作成または取得

        デバイスID認証における基本的な認証フロー。
        新規デバイスの場合は新しいユーザーを作成し、
        既存デバイスの場合は既存ユーザーに紐付ける。

        Args:
            device_id: デバイスの一意識別子（UUID）

        Returns:
            Dict: {
                "user_id": str,
                "is_new_user": bool
            }
        """
        try:
            # 既存のデバイス認証を確認
            existing_device = await self.device_repo.find_by_device_id(device_id)

            if existing_device:
                # 既存ユーザー: ログイン日時を更新
                updated_device = existing_device.update_login()
                await self.device_repo.save(updated_device)

                logger.info(
                    "Device login",
                    extra={
                        "device_id": device_id[:20] + "...",
                        "user_id": existing_device.user_id
                    }
                )

                return {
                    "user_id": existing_device.user_id,
                    "is_new_user": False
                }

            # 新規ユーザー作成
            user_id = await self._generate_unique_user_id()

            # ユーザーレコード作成
            new_user = User.create_device_user(user_id=user_id)
            await self.user_repo.save(new_user)

            # デバイス認証レコード作成
            new_device = Device.register_new(
                device_id=device_id,
                user_id=user_id
            )
            await self.device_repo.save(new_device)

            # 初期クレジット作成
            if self.credit_creator:
                await self.credit_creator.create_initial_credits(user_id)

            logger.info(
                "New device registered",
                extra={
                    "device_id": device_id[:20] + "...",
                    "user_id": user_id
                }
            )

            return {
                "user_id": user_id,
                "is_new_user": True
            }

        except Exception as e:
            logger.error(f"Failed to register device: {e}")
            raise ValueError(f"Device registration failed: {e}") from e

    async def get_user_by_device_id(self, device_id: str) -> User | None:
        """デバイスIDからユーザーを取得

        Args:
            device_id: デバイスID

        Returns:
            Optional[User]: ユーザーエンティティ（存在しない場合はNone）
        """
        device = await self.device_repo.find_by_device_id(device_id)

        if not device:
            return None

        # ログイン日時を更新
        updated_device = device.update_login()
        await self.device_repo.save(updated_device)

        # ユーザーを取得
        user = await self.user_repo.find_by_id(device.user_id)

        return user

    async def get_user_profile(self, user_id: str) -> dict[str, Any] | None:
        """ユーザープロフィールを取得

        Args:
            user_id: ユーザーID

        Returns:
            Optional[Dict]: ユーザープロフィール、存在しない場合はNone
        """
        user = await self.user_repo.find_by_id(user_id)

        if not user:
            return None

        return {
            "user_id": user.user_id,
            "email": user.email,
            "display_name": user.display_name,
            "profile_picture_url": user.profile_picture_url,
            "is_google_authenticated": user.is_google_authenticated(),
            "created_at": user.created_at.isoformat() if user.created_at else None
        }

    async def verify_user_device_association(
        self, device_id: str, client_user_id: str
    ) -> dict[str, Any]:
        """デバイスIDとユーザーIDの対応関係を検証

        クライアント側で保持しているuser_idと、サーバー側のdevice_idに
        紐付いているuser_idが一致しているかを確認する。

        Args:
            device_id: デバイスID
            client_user_id: クライアント側で保持しているユーザーID

        Returns:
            Dict: {
                "valid": bool,
                "correct_user_id": str,
                "message": str
            }
        """
        device = await self.device_repo.find_by_device_id(device_id)

        if not device:
            logger.warning(
                "Device verification failed: Device not found",
                extra={"device_id": device_id[:20] + "..."}
            )
            return {
                "valid": False,
                "correct_user_id": "",
                "message": f"Device not registered: {device_id}"
            }

        server_user_id = device.user_id

        # ログイン日時を更新
        updated_device = device.update_login()
        await self.device_repo.save(updated_device)

        if server_user_id != client_user_id:
            # 不一致の場合
            logger.warning(
                "User ID mismatch detected",
                extra={
                    "device_id": device_id[:20] + "...",
                    "client_user_id": client_user_id,
                    "server_user_id": server_user_id
                }
            )
            return {
                "valid": False,
                "correct_user_id": server_user_id,
                "message": "User ID mismatch. Please update to the correct user_id."
            }

        # 一致している場合
        logger.info(
            "Device verification successful",
            extra={"device_id": device_id[:20] + "...", "user_id": server_user_id}
        )

        return {
            "valid": True,
            "correct_user_id": server_user_id,
            "message": "Device and user verified successfully"
        }

    async def _generate_unique_user_id(self) -> str:
        """一意なユーザーIDを生成

        既存のユーザーIDと重複しないことを保証する。

        Returns:
            str: ユーザーID（例: user_abc123def）
        """
        max_attempts = 10

        for _attempt in range(max_attempts):
            # ランダムな文字列を生成
            random_part = ''.join(
                secrets.choice(string.ascii_lowercase + string.digits)
                for _ in range(9)
            )
            user_id = f"user_{random_part}"

            # 既存のユーザーIDと重複していないか確認
            exists = await self.user_repo.exists_by_user_id(user_id)
            if not exists:
                return user_id

        # 10回試行しても重複した場合（非常に稀）
        raise ValueError("Failed to generate unique user_id after 10 attempts")

    async def user_exists(self, user_id: str) -> bool:
        """ユーザーの存在確認

        Args:
            user_id: ユーザーID

        Returns:
            bool: 存在する場合True
        """
        return await self.user_repo.exists_by_user_id(user_id)

    async def get_total_users(self) -> int:
        """総ユーザー数を取得

        Returns:
            int: 総ユーザー数
        """
        return await self.user_repo.count()
