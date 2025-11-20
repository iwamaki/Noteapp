# @file google_oauth_client.py
# @summary Google OAuth クライアント
# @responsibility Google OAuth API への外部呼び出し

import os
from typing import Any
from urllib.parse import urlencode

import requests

from src.auth.infrastructure.config.constants import AUTH_URI, TOKEN_URI, USERINFO_URI
from src.auth.infrastructure.external.secret_manager_client import get_secret
from src.core.logger import logger


class GoogleOAuthClientError(Exception):
    """Google OAuth クライアントエラー"""
    pass


class GoogleOAuthClient:
    """Google OAuth API クライアント"""

    def __init__(self):
        # Secret Managerから取得（環境変数フォールバック付き）
        self.client_id = get_secret("GOOGLE_WEB_CLIENT_ID", "GOOGLE_WEB_CLIENT_ID") or ""
        self.client_secret = get_secret("GOOGLE_WEB_CLIENT_SECRET", "GOOGLE_WEB_CLIENT_SECRET") or ""
        # リダイレクトURIは秘密情報ではないので環境変数から直接読み込む
        self.redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "")

    def generate_auth_url(self, state: str) -> str:
        """
        Google 認証 URL を生成

        Args:
            state: OAuth2 state パラメータ

        Returns:
            Google 認証 URL

        Raises:
            GoogleOAuthClientError: 設定エラー
        """
        if not self.client_id:
            raise GoogleOAuthClientError("GOOGLE_WEB_CLIENT_ID not configured")

        if not self.redirect_uri:
            raise GoogleOAuthClientError("GOOGLE_OAUTH_REDIRECT_URI not configured")

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
        }

        auth_url = f"{AUTH_URI}?{urlencode(params)}"

        logger.debug(
            f"Generated Google auth URL: client_id={self.client_id[:20]}..., "
            f"redirect_uri={self.redirect_uri}"
        )

        return auth_url

    def exchange_code_for_tokens(self, code: str) -> dict[str, Any]:
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
            GoogleOAuthClientError: トークン交換失敗
        """
        if not self.client_secret:
            raise GoogleOAuthClientError("GOOGLE_WEB_CLIENT_SECRET not configured")

        token_data = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }

        try:
            logger.debug("Exchanging authorization code for tokens...")

            response = requests.post(
                TOKEN_URI,
                data=token_data,
                timeout=10
            )

            response.raise_for_status()
            tokens = response.json()

            logger.info("Successfully exchanged authorization code for tokens")

            return tokens

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to exchange authorization code: {e}")
            raise GoogleOAuthClientError(f"Token exchange failed: {str(e)}") from e

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
            GoogleOAuthClientError: ユーザー情報取得失敗
        """
        try:
            logger.debug("Fetching user info from Google...")

            response = requests.get(
                USERINFO_URI,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10
            )

            response.raise_for_status()
            user_info = response.json()

            logger.info(
                f"Successfully fetched user info: email={user_info.get('email', '')[:20]}..."
            )

            return user_info

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to fetch user info: {e}")
            raise GoogleOAuthClientError(f"User info fetch failed: {str(e)}") from e
