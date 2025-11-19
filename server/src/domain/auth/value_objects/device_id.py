"""
@file device_id.py
@summary DeviceId値オブジェクト
@responsibility デバイスIDを表現する値オブジェクト
"""

import uuid
from dataclasses import dataclass


@dataclass(frozen=True)
class DeviceId:
    """デバイスID値オブジェクト

    デバイスの一意識別子を表現する不変オブジェクト。
    通常はUUID形式であることを期待するが、任意の文字列も許可する。

    ビジネスルール:
    - valueは必須
    - valueは空文字列ではない
    """

    value: str

    def __post_init__(self):
        """初期化後のバリデーション"""
        if not self.value:
            raise ValueError("Device ID cannot be empty")

        if len(self.value) > 255:
            raise ValueError(f"Device ID too long: {len(self.value)} chars")

    def is_uuid_format(self) -> bool:
        """UUID形式かどうかをチェック

        Returns:
            bool: UUID形式の場合True
        """
        try:
            uuid.UUID(self.value)
            return True
        except ValueError:
            return False

    def __str__(self) -> str:
        """文字列表現を返す"""
        return self.value

    def __repr__(self) -> str:
        """開発者向け文字列表現"""
        return f"DeviceId('{self.value[:20]}...')" if len(self.value) > 20 else f"DeviceId('{self.value}')"

    @staticmethod
    def generate() -> "DeviceId":
        """新しいデバイスIDを生成（UUID v4）

        Returns:
            DeviceId: 新しいDeviceIdインスタンス
        """
        return DeviceId(str(uuid.uuid4()))

    @staticmethod
    def from_string(value: str) -> "DeviceId":
        """文字列からDeviceIdを作成

        Args:
            value: デバイスID文字列

        Returns:
            DeviceId: 新しいDeviceIdインスタンス
        """
        return DeviceId(value)
