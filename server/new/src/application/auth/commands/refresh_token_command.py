"""
@file refresh_token_command.py
@summary RefreshTokenCommand - トークンリフレッシュコマンド
@responsibility リフレッシュトークンを使った新しいアクセストークン発行
"""

from typing import Any

from src.domain.auth.services.token_service import TokenService


class RefreshTokenCommand:
    """トークンリフレッシュコマンド

    リフレッシュトークンを検証し、新しいアクセストークンを発行する。

    責務:
    - リフレッシュトークン検証
    - 新しいアクセストークン生成
    - エラーハンドリング
    """

    def __init__(
        self,
        token_service: TokenService,
    ):
        """初期化

        Args:
            token_service: トークンサービス
        """
        self.token_service = token_service

    async def execute(self, refresh_token: str) -> dict[str, Any] | None:
        """トークンリフレッシュを実行

        Args:
            refresh_token: JWTリフレッシュトークン

        Returns:
            Optional[Dict]: 新しいトークン情報、検証失敗時はNone
                {
                    "success": bool,
                    "access_token": str,
                    "refresh_token": str,  # 新しいリフレッシュトークン
                    "token_type": "Bearer",
                    "expires_in": int
                }
        """
        # リフレッシュトークンを検証してペイロード取得
        payload = self.token_service.verify_refresh_token(refresh_token)

        if not payload:
            return None

        user_id = payload.get("sub")
        device_id = payload.get("device_id")

        if not user_id or not device_id:
            return None

        # 新しいトークンペアを生成
        tokens = self.token_service.generate_token_pair(user_id, device_id)

        return {
            "success": True,
            **tokens
        }
