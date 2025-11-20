"""
@file device_repository.py
@summary DeviceRepositoryインターフェース - デバイスリポジトリ
@responsibility デバイスのデータアクセスを抽象化
"""

from abc import ABC, abstractmethod

from ..entities.device import Device


class DeviceRepository(ABC):
    """デバイスリポジトリインターフェース

    Deviceエンティティのデータアクセスを抽象化する。
    具体的な実装（SQLAlchemy等）は Persistence 層で行う。
    """

    @abstractmethod
    async def find_by_device_id(self, device_id: str) -> Device | None:
        """デバイスIDでデバイスを取得

        Args:
            device_id: デバイスID

        Returns:
            Optional[Device]: デバイスエンティティ、存在しない場合はNone
        """
        pass

    @abstractmethod
    async def find_all_by_user_id(self, user_id: str) -> list[Device]:
        """ユーザーIDで全デバイスを取得

        Args:
            user_id: ユーザーID

        Returns:
            List[Device]: デバイスエンティティのリスト
        """
        pass

    @abstractmethod
    async def find_active_by_user_id(self, user_id: str) -> list[Device]:
        """ユーザーIDでアクティブなデバイスを取得

        Args:
            user_id: ユーザーID

        Returns:
            List[Device]: アクティブなデバイスエンティティのリスト
        """
        pass

    @abstractmethod
    async def exists_by_device_id(self, device_id: str) -> bool:
        """デバイスIDでデバイスの存在をチェック

        Args:
            device_id: デバイスID

        Returns:
            bool: 存在する場合True
        """
        pass

    @abstractmethod
    async def save(self, device: Device) -> Device:
        """デバイスを保存（新規作成または更新）

        Args:
            device: デバイスエンティティ

        Returns:
            Device: 保存されたデバイスエンティティ（idが設定される）
        """
        pass

    @abstractmethod
    async def delete(self, device: Device) -> None:
        """デバイスを削除

        Args:
            device: デバイスエンティティ
        """
        pass

    @abstractmethod
    async def count_by_user_id(self, user_id: str) -> int:
        """ユーザーのデバイス数を取得

        Args:
            user_id: ユーザーID

        Returns:
            int: デバイス数
        """
        pass
