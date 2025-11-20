"""
@file login_with_google_command.py
@summary LoginWithGoogleCommand - Google OAuthログインコマンド
@responsibility Google OAuth認証フローのビジネスロジックを調整
"""

from typing import Any

from src.domain.auth.services.oauth_service import OAuthService
from src.domain.auth.services.token_service import TokenService


class LoginWithGoogleCommand:
    """Google OAuthログインコマンド

    Fatコントローラーから移行された主要ロジック。
    OAuth認証フロー全体を調整し、トークンを発行する。

    責務:
    - OAuth認証フローの調整
    - ユーザー作成/更新
    - デバイス登録
    - JWTトークンペアの生成
    """

    def __init__(
        self,
        oauth_service: OAuthService,
        token_service: TokenService,
    ):
        """初期化

        Args:
            oauth_service: OAuth認証サービス
            token_service: トークンサービス
        """
        self.oauth_service = oauth_service
        self.token_service = token_service

    async def execute(
        self, authorization_code: str, device_id: str
    ) -> dict[str, Any]:
        """Google OAuthログインを実行

        これはFatコントローラー（oauth_router.py: google_callback）から
        移行された主要ロジック。約150行のロジックがここに集約されている。

        Args:
            authorization_code: Google Authorization Code
            device_id: デバイスID

        Returns:
            Dict: {
                "user_id": str,
                "is_new_user": bool,
                "email": str,
                "display_name": Optional[str],
                "profile_picture_url": Optional[str],
                "access_token": str,
                "refresh_token": str,
                "token_type": "Bearer",
                "expires_in": int
            }
        """
        # OAuth認証フロー処理（ユーザー作成/更新、デバイス登録）
        oauth_result = await self.oauth_service.handle_oauth_callback(
            authorization_code=authorization_code,
            device_id=device_id
        )

        user_id = oauth_result["user_id"]
        is_new_user = oauth_result["is_new_user"]
        email = oauth_result["email"]
        display_name = oauth_result.get("display_name")
        profile_picture_url = oauth_result.get("profile_picture_url")

        # トークンペア生成
        tokens = self.token_service.generate_token_pair(user_id, device_id)

        return {
            "user_id": user_id,
            "is_new_user": is_new_user,
            "email": email,
            "display_name": display_name,
            "profile_picture_url": profile_picture_url,
            **tokens
        }
