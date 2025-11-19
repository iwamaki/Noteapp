"""
@file device_service.py
@summary DeviceServiceドメインサービス - デバイス管理
@responsibility デバイス登録・認証・管理のビジネスロジック
"""

from typing import Any

from src.core.logger import logger

from ..entities.device import Device
from ..repositories.device_repository import DeviceRepository
from ..repositories.user_repository import UserRepository


class DeviceService:
    """デバイス管理ドメインサービス

    デバイス登録、認証、管理に関するビジネスロジックを提供する。

    責務:
    - デバイス登録
    - デバイスとユーザーの紐付け確認
    - デバイス情報更新
    - デバイス削除（論理削除）
    """

    def __init__(
        self,
        device_repo: DeviceRepository,
        user_repo: UserRepository
    ):
        """初期化

        Args:
            device_repo: デバイスリポジトリ
            user_repo: ユーザーリポジトリ
        """
        self.device_repo = device_repo
        self.user_repo = user_repo

    async def register_device_for_user(
        self,
        device_id: str,
        user_id: str,
        device_name: str | None = None,
        device_type: str | None = None
    ) -> dict[str, Any]:
        """ユーザーにデバイスを登録

        Args:
            device_id: デバイスID
            user_id: ユーザーID
            device_name: デバイス名
            device_type: デバイスタイプ

        Returns:
            Dict: {"success": True, "device": Device, "is_new": bool}

        Raises:
            ValueError: ユーザーが存在しない場合
        """
        # ユーザーの存在確認
        user_exists = await self.user_repo.exists_by_user_id(user_id)
        if not user_exists:
            raise ValueError(f"User not found: {user_id}")

        # 既存デバイスチェック
        existing_device = await self.device_repo.find_by_device_id(device_id)

        if existing_device:
            # 既存デバイス: ログイン日時を更新
            updated_device = existing_device.update_login()

            # 別のユーザーに紐付けられている場合は警告
            if not existing_device.belongs_to_user(user_id):
                logger.warning(
                    "Device reassignment detected",
                    extra={
                        "device_id": device_id[:20] + "...",
                        "old_user_id": existing_device.user_id,
                        "new_user_id": user_id
                    }
                )
                # 再割り当て
                updated_device = existing_device.reassign_to_user(user_id)

            saved_device = await self.device_repo.save(updated_device)

            logger.info(
                "Device login",
                extra={"device_id": device_id[:20] + "...", "user_id": user_id}
            )

            return {
                "success": True,
                "device": saved_device,
                "is_new": False
            }

        # 新規デバイス登録
        new_device = Device.register_new(
            device_id=device_id,
            user_id=user_id,
            device_name=device_name,
            device_type=device_type
        )

        saved_device = await self.device_repo.save(new_device)

        logger.info(
            "New device registered",
            extra={"device_id": device_id[:20] + "...", "user_id": user_id}
        )

        return {
            "success": True,
            "device": saved_device,
            "is_new": True
        }

    async def verify_device_belongs_to_user(
        self, device_id: str, user_id: str
    ) -> dict[str, Any]:
        """デバイスが指定されたユーザーに属しているか検証

        Args:
            device_id: デバイスID
            user_id: ユーザーID

        Returns:
            Dict: {
                "valid": bool,
                "device": Optional[Device],
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
                "device": None,
                "message": f"Device not registered: {device_id}"
            }

        # アクティブチェック
        if not device.is_authorized():
            logger.warning(
                "Device verification failed: Device inactive",
                extra={"device_id": device_id[:20] + "..."}
            )
            return {
                "valid": False,
                "device": device,
                "message": "Device is inactive"
            }

        # ユーザー所属チェック
        if not device.belongs_to_user(user_id):
            logger.warning(
                "Device verification failed: User mismatch",
                extra={
                    "device_id": device_id[:20] + "...",
                    "expected_user_id": user_id,
                    "actual_user_id": device.user_id
                }
            )
            return {
                "valid": False,
                "device": device,
                "message": "Device does not belong to this user"
            }

        # ログイン日時を更新
        updated_device = device.update_login()
        await self.device_repo.save(updated_device)

        logger.info(
            "Device verification successful",
            extra={"device_id": device_id[:20] + "...", "user_id": user_id}
        )

        return {
            "valid": True,
            "device": updated_device,
            "message": "Device verified successfully"
        }

    async def get_user_devices(self, user_id: str) -> list[Device]:
        """ユーザーの全デバイスを取得

        Args:
            user_id: ユーザーID

        Returns:
            List[Device]: デバイスリスト
        """
        devices = await self.device_repo.find_all_by_user_id(user_id)

        logger.info(
            "Retrieved user devices",
            extra={"user_id": user_id, "count": len(devices)}
        )

        return devices

    async def update_device_info(
        self,
        device_id: str,
        device_name: str | None = None,
        device_type: str | None = None
    ) -> dict[str, Any]:
        """デバイス情報を更新

        Args:
            device_id: デバイスID
            device_name: デバイス名
            device_type: デバイスタイプ

        Returns:
            Dict: {"success": True, "device": Device}

        Raises:
            ValueError: デバイスが見つからない場合
        """
        device = await self.device_repo.find_by_device_id(device_id)

        if not device:
            raise ValueError(f"Device not found: {device_id}")

        updated_device = device.update_info(
            device_name=device_name,
            device_type=device_type
        )

        saved_device = await self.device_repo.save(updated_device)

        logger.info(
            "Device info updated",
            extra={
                "device_id": device_id[:20] + "...",
                "name": device_name,
                "type": device_type
            }
        )

        return {
            "success": True,
            "device": saved_device
        }

    async def deactivate_device(
        self, device_id: str, user_id: str
    ) -> dict[str, Any]:
        """デバイスを非アクティブ化（論理削除）

        Args:
            device_id: デバイスID
            user_id: ユーザーID（所有権確認用）

        Returns:
            Dict: {"success": True, "message": str}

        Raises:
            ValueError: デバイスが見つからない、または権限がない場合
        """
        device = await self.device_repo.find_by_device_id(device_id)

        if not device:
            raise ValueError(f"Device not found: {device_id}")

        # 所有権確認
        if not device.belongs_to_user(user_id):
            logger.warning(
                "Device deactivation denied: Access denied",
                extra={
                    "device_id": device_id[:20] + "...",
                    "requested_by": user_id,
                    "owner": device.user_id
                }
            )
            raise ValueError("You don't have permission to deactivate this device")

        deactivated_device = device.deactivate()
        await self.device_repo.save(deactivated_device)

        logger.info(
            "Device deactivated",
            extra={"device_id": device_id[:20] + "...", "user_id": user_id}
        )

        return {
            "success": True,
            "message": "Device deactivated successfully"
        }

    async def count_user_devices(self, user_id: str) -> int:
        """ユーザーのデバイス数を取得

        Args:
            user_id: ユーザーID

        Returns:
            int: デバイス数
        """
        return await self.device_repo.count_by_user_id(user_id)
