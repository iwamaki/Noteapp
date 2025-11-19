"""
@file jwt_token.py
@summary JWTToken値オブジェクト
@responsibility JWTトークンを表現する値オブジェクト
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any


@dataclass(frozen=True)
class JWTToken:
    """JWTトークン値オブジェクト

    JWTトークンを表現する不変オブジェクト。
    トークンの内容は変更不可で、再生成のみ可能。

    ビジネスルール:
    - tokenは必須
    - token_typeは "access" または "refresh"
    - expires_atは未来の日時でなければならない
    """

    token: str
    token_type: str  # "access" or "refresh"
    expires_at: datetime
    payload: dict[str, Any]

    def __post_init__(self):
        """初期化後のバリデーション"""
        if not self.token:
            raise ValueError("token is required")

        if self.token_type not in ["access", "refresh"]:
            raise ValueError(f"Invalid token_type: {self.token_type}")

        if self.expires_at <= datetime.utcnow():
            raise ValueError("expires_at must be in the future")

    def is_expired(self) -> bool:
        """トークンが有効期限切れかチェック

        Returns:
            bool: 有効期限切れの場合True
        """
        return datetime.utcnow() >= self.expires_at

    def is_valid(self) -> bool:
        """トークンが有効かチェック

        Returns:
            bool: 有効な場合True
        """
        return not self.is_expired()

    def remaining_lifetime(self) -> timedelta:
        """残りの有効期限を取得

        Returns:
            timedelta: 残りの有効期限
        """
        if self.is_expired():
            return timedelta(0)
        return self.expires_at - datetime.utcnow()

    def remaining_seconds(self) -> int:
        """残りの有効期限（秒）を取得

        Returns:
            int: 残りの有効期限（秒）
        """
        return max(0, int(self.remaining_lifetime().total_seconds()))

    def get_user_id(self) -> str:
        """ペイロードからユーザーIDを取得

        Returns:
            str: ユーザーID

        Raises:
            ValueError: ユーザーIDが見つからない場合
        """
        user_id = self.payload.get("sub")
        if not isinstance(user_id, str):
            raise ValueError("User ID not found in token payload")
        return user_id

    def get_device_id(self) -> str | None:
        """ペイロードからデバイスIDを取得

        Returns:
            Optional[str]: デバイスID（存在しない場合はNone）
        """
        return self.payload.get("device_id")

    @staticmethod
    def create_access_token(
        token: str,
        user_id: str,
        device_id: str,
        expires_at: datetime,
        additional_claims: dict[str, Any] | None = None
    ) -> "JWTToken":
        """アクセストークンを作成

        Args:
            token: JWTトークン文字列
            user_id: ユーザーID
            device_id: デバイスID
            expires_at: 有効期限
            additional_claims: 追加のクレーム

        Returns:
            JWTToken: 新しいJWTTokenインスタンス
        """
        payload = {
            "sub": user_id,
            "device_id": device_id,
            "type": "access",
            "exp": int(expires_at.timestamp()),
            **(additional_claims or {})
        }

        return JWTToken(
            token=token,
            token_type="access",
            expires_at=expires_at,
            payload=payload
        )

    @staticmethod
    def create_refresh_token(
        token: str,
        user_id: str,
        device_id: str,
        expires_at: datetime,
        additional_claims: dict[str, Any] | None = None
    ) -> "JWTToken":
        """リフレッシュトークンを作成

        Args:
            token: JWTトークン文字列
            user_id: ユーザーID
            device_id: デバイスID
            expires_at: 有効期限
            additional_claims: 追加のクレーム

        Returns:
            JWTToken: 新しいJWTTokenインスタンス
        """
        payload = {
            "sub": user_id,
            "device_id": device_id,
            "type": "refresh",
            "exp": int(expires_at.timestamp()),
            **(additional_claims or {})
        }

        return JWTToken(
            token=token,
            token_type="refresh",
            expires_at=expires_at,
            payload=payload
        )
