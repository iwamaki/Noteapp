"""
@file verify_token_query.py
@summary VerifyTokenQuery - トークン検証クエリ
@responsibility JWTトークンの検証とペイロード取得
"""

from typing import Any

from src.domain.auth.services.token_service import TokenService


class VerifyTokenQuery:
    """トークン検証クエリ

    JWTトークンを検証し、ペイロード情報を取得する。

    責務:
    - トークン検証
    - ペイロード抽出
    - ユーザーID、デバイスID取得
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

    async def execute(self, access_token: str) -> dict[str, Any] | None:
        """トークン検証を実行

        Args:
            access_token: 検証するアクセストークン

        Returns:
            Optional[Dict]: トークンペイロード、検証失敗時はNone
                {
                    "user_id": str,
                    "device_id": str,
                    "type": "access",
                    "exp": int,  # エポック秒
                    "iat": int   # エポック秒
                }
        """
        payload = self.token_service.verify_access_token(access_token)

        return payload
