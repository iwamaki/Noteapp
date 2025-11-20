# @file oauth_service.py
# @summary Google OAuth2 認証サービス
# @responsibility Google OAuth2 の認証フロー処理（ビジネスロジック層）

from typing import Any

from src.auth.infrastructure.external.google_oauth_client import GoogleOAuthClient
from src.core.logger import logger


class OAuthServiceError(Exception):
    """OAuth サービスエラー"""
    pass


class OAuthService:
    """OAuth 認証サービスクラス"""

    def __init__(self):
        self.oauth_client = GoogleOAuthClient()

    def start_auth_flow(self, state: str) -> str:
        """
        Google 認証フローを開始し、認証 URL を生成

        Args:
            state: OAuth2 state パラメータ

        Returns:
            Google 認証 URL

        Raises:
            OAuthServiceError: 認証 URL 生成失敗
        """
        try:
            auth_url = self.oauth_client.generate_auth_url(state)
            logger.debug(f"OAuth auth flow started with state: {state[:10]}...")
            return auth_url
        except Exception as e:
            logger.error(f"Failed to start OAuth auth flow: {e}")
            raise OAuthServiceError(f"Failed to start auth flow: {str(e)}") from e

    def exchange_code(self, code: str) -> dict[str, Any]:
        """
        Authorization Code をトークンに交換

        Args:
            code: Authorization Code

        Returns:
            トークン情報 {
                "access_token": str,
                "id_token": str,
                "expires_in": int,
                "token_type": str
            }

        Raises:
            OAuthServiceError: トークン交換失敗
        """
        try:
            tokens = self.oauth_client.exchange_code_for_tokens(code)
            logger.info("Successfully exchanged authorization code for tokens")
            return tokens
        except Exception as e:
            logger.error(f"Failed to exchange authorization code: {e}")
            raise OAuthServiceError(f"Token exchange failed: {str(e)}") from e

    def get_user_info(self, access_token: str) -> dict[str, Any]:
        """
        Access Token からユーザー情報を取得

        Args:
            access_token: Access Token

        Returns:
            ユーザー情報 {
                "id": str,  # Google User ID
                "email": str,
                "verified_email": bool,
                "name": str,
                "picture": str
            }

        Raises:
            OAuthServiceError: ユーザー情報取得失敗
        """
        try:
            user_info = self.oauth_client.get_user_info(access_token)
            logger.info(f"Successfully fetched user info: email={user_info.get('email', '')[:20]}...")
            return user_info
        except Exception as e:
            logger.error(f"Failed to fetch user info: {e}")
            raise OAuthServiceError(f"User info fetch failed: {str(e)}") from e
