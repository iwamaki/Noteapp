"""
@file get_user_profile_query.py
@summary GetUserProfileQuery - ユーザープロフィール取得クエリ
@responsibility ユーザープロフィール情報の取得
"""

from typing import Any

from src.domain.auth.services.auth_service import AuthService


class GetUserProfileQuery:
    """ユーザープロフィール取得クエリ

    ユーザーIDからプロフィール情報を取得する。

    責務:
    - ユーザープロフィール取得
    - データ整形
    """

    def __init__(
        self,
        auth_service: AuthService,
    ):
        """初期化

        Args:
            auth_service: 認証サービス
        """
        self.auth_service = auth_service

    async def execute(self, user_id: str) -> dict[str, Any] | None:
        """ユーザープロフィール取得を実行

        Args:
            user_id: ユーザーID

        Returns:
            Optional[Dict]: ユーザープロフィール、存在しない場合はNone
                {
                    "user_id": str,
                    "email": Optional[str],
                    "display_name": Optional[str],
                    "profile_picture_url": Optional[str],
                    "is_google_authenticated": bool,
                    "created_at": Optional[str]  # ISO format
                }
        """
        profile = await self.auth_service.get_user_profile(user_id)

        return profile
