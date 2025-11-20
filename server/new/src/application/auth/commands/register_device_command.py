"""
@file register_device_command.py
@summary RegisterDeviceCommand - デバイス登録コマンド
@responsibility デバイスID認証によるユーザー登録のビジネスロジックを調整
"""

from typing import Any

from src.domain.auth.services.auth_service import AuthService
from src.domain.auth.services.token_service import TokenService


class RegisterDeviceCommand:
    """デバイス登録コマンド

    デバイスID認証によるユーザー登録とトークン発行を調整する。

    責務:
    - デバイス登録処理の調整
    - JWTトークンペアの生成
    - レスポンス構築
    """

    def __init__(
        self,
        auth_service: AuthService,
        token_service: TokenService,
    ):
        """初期化

        Args:
            auth_service: 認証サービス
            token_service: トークンサービス
        """
        self.auth_service = auth_service
        self.token_service = token_service

    async def execute(self, device_id: str) -> dict[str, Any]:
        """デバイス登録を実行

        Args:
            device_id: デバイスID

        Returns:
            Dict: {
                "user_id": str,
                "is_new_user": bool,
                "access_token": str,
                "refresh_token": str,
                "token_type": "Bearer",
                "expires_in": int
            }
        """
        # デバイス登録（ユーザー作成または取得）
        result = await self.auth_service.register_device(device_id)
        user_id = result["user_id"]
        is_new_user = result["is_new_user"]

        # トークンペア生成
        tokens = self.token_service.generate_token_pair(user_id, device_id)

        # メッセージ生成
        message = "New account created" if is_new_user else "Welcome back"

        return {
            "user_id": user_id,
            "is_new_user": is_new_user,
            "message": message,
            **tokens
        }
