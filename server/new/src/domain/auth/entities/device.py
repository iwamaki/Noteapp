"""
@file device.py
@summary Deviceエンティティ - デバイスドメインモデル
@responsibility デバイス認証とユーザー紐付けを管理するドメインエンティティ
"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Device:
    """デバイスエンティティ

    ユーザーのデバイス（スマートフォン、タブレット等）を表現する。
    デバイスIDとユーザーIDの紐付けを管理し、マルチデバイス対応を実現。

    ビジネスルール:
    - device_idは必須かつ一意
    - user_idは必須
    - アクティブなデバイスのみが認証可能
    - 最終ログイン日時は更新される
    """

    device_id: str
    user_id: str
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.now)
    last_login_at: datetime = field(default_factory=datetime.now)

    # デバイス情報（オプショナル）
    device_name: str | None = None  # 例: "iPhone 14 Pro"
    device_type: str | None = None  # 例: "ios", "android"

    id: int | None = None  # 永続化後にDBから設定される

    def __post_init__(self):
        """初期化後のバリデーション"""
        self._validate()

    def _validate(self):
        """ビジネスルールのバリデーション"""
        if not self.device_id:
            raise ValueError("device_id is required")

        if not self.user_id:
            raise ValueError("user_id is required")

        if self.device_type and self.device_type not in ["ios", "android", "web"]:
            raise ValueError(
                f"device_type must be 'ios', 'android', or 'web', got: {self.device_type}"
            )

    def is_authorized(self) -> bool:
        """デバイスが認証可能かどうかをチェック

        Returns:
            bool: アクティブな場合True
        """
        return self.is_active

    def update_login(self) -> "Device":
        """ログイン日時を更新

        Returns:
            Device: 更新された新しいDeviceインスタンス（イミュータブル性）
        """
        return Device(
            id=self.id,
            device_id=self.device_id,
            user_id=self.user_id,
            is_active=self.is_active,
            created_at=self.created_at,
            last_login_at=datetime.now(),
            device_name=self.device_name,
            device_type=self.device_type
        )

    def deactivate(self) -> "Device":
        """デバイスを非アクティブ化（論理削除）

        Returns:
            Device: 非アクティブ化された新しいDeviceインスタンス
        """
        return Device(
            id=self.id,
            device_id=self.device_id,
            user_id=self.user_id,
            is_active=False,
            created_at=self.created_at,
            last_login_at=self.last_login_at,
            device_name=self.device_name,
            device_type=self.device_type
        )

    def activate(self) -> "Device":
        """デバイスを再アクティブ化

        Returns:
            Device: アクティブ化された新しいDeviceインスタンス
        """
        return Device(
            id=self.id,
            device_id=self.device_id,
            user_id=self.user_id,
            is_active=True,
            created_at=self.created_at,
            last_login_at=self.last_login_at,
            device_name=self.device_name,
            device_type=self.device_type
        )

    def update_info(
        self,
        device_name: str | None = None,
        device_type: str | None = None
    ) -> "Device":
        """デバイス情報を更新

        Args:
            device_name: デバイス名
            device_type: デバイスタイプ

        Returns:
            Device: 更新された新しいDeviceインスタンス
        """
        return Device(
            id=self.id,
            device_id=self.device_id,
            user_id=self.user_id,
            is_active=self.is_active,
            created_at=self.created_at,
            last_login_at=self.last_login_at,
            device_name=device_name if device_name is not None else self.device_name,
            device_type=device_type if device_type is not None else self.device_type
        )

    def reassign_to_user(self, new_user_id: str) -> "Device":
        """デバイスを別のユーザーに再割り当て

        注意: この操作はセキュリティ上慎重に行う必要がある

        Args:
            new_user_id: 新しいユーザーID

        Returns:
            Device: 再割り当てされた新しいDeviceインスタンス
        """
        if not new_user_id:
            raise ValueError("new_user_id is required")

        return Device(
            id=self.id,
            device_id=self.device_id,
            user_id=new_user_id,
            is_active=self.is_active,
            created_at=self.created_at,
            last_login_at=datetime.now(),  # 再割り当て時にログイン日時も更新
            device_name=self.device_name,
            device_type=self.device_type
        )

    def belongs_to_user(self, user_id: str) -> bool:
        """デバイスが指定されたユーザーに属しているかチェック

        Args:
            user_id: チェックするユーザーID

        Returns:
            bool: 属している場合True
        """
        return self.user_id == user_id

    @staticmethod
    def register_new(
        device_id: str,
        user_id: str,
        device_name: str | None = None,
        device_type: str | None = None
    ) -> "Device":
        """新しいデバイスを登録

        Args:
            device_id: デバイスID（UUID）
            user_id: ユーザーID
            device_name: デバイス名
            device_type: デバイスタイプ

        Returns:
            Device: 新しいDeviceインスタンス
        """
        return Device(
            device_id=device_id,
            user_id=user_id,
            device_name=device_name,
            device_type=device_type
        )
