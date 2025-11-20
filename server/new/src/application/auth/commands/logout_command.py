"""
@file logout_command.py
@summary LogoutCommand - ログアウトコマンド
@responsibility トークンペアの無効化処理
"""

from typing import Any

from src.domain.auth.services.token_service import TokenService


class LogoutCommand:
    """ログアウトコマンド

    アクセストークンとリフレッシュトークンをブラックリストに追加し、
    それらのトークンを無効化する。

    責務:
    - トークンペアの無効化
    - ブラックリスト登録
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

    async def execute(
        self, access_token: str, refresh_token: str
    ) -> dict[str, Any]:
        """ログアウトを実行

        Args:
            access_token: 無効化するアクセストークン
            refresh_token: 無効化するリフレッシュトークン

        Returns:
            Dict: {"success": True, "message": str}
        """
        # トークンペアを無効化
        result = self.token_service.revoke_token_pair(
            access_token=access_token,
            refresh_token=refresh_token
        )

        return result
