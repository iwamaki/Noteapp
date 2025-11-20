"""
@file client.py
@summary Google OAuth2クライアント
@responsibility Google OAuth2フローの処理を提供
"""

import requests
from typing import Dict, Any
from urllib.parse import urlencode


class GoogleOAuthError(Exception):
    """Google OAuth関連エラー"""
    pass


class GoogleOAuthClient:
    """Google OAuth2クライアント

    Authorization Code Flowを使用したGoogle認証を処理する。
    """

    # Google OAuth2エンドポイント
    AUTH_URI = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URI = "https://oauth2.googleapis.com/token"
    USERINFO_URI = "https://www.googleapis.com/oauth2/v2/userinfo"

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
    ):
        """
        Args:
            client_id: Google OAuth2 Client ID
            client_secret: Google OAuth2 Client Secret
            redirect_uri: リダイレクトURI
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

    def generate_auth_url(
        self,
        state: str,
        scopes: list[str] | None = None,
    ) -> str:
        """認証URLを生成

        Args:
            state: CSRFトークン
            scopes: 要求するスコープ（デフォルト: openid, email, profile）

        Returns:
            認証URL
        """
        if not self.client_id:
            raise GoogleOAuthError("Client ID not configured")

        if not self.redirect_uri:
            raise GoogleOAuthError("Redirect URI not configured")

        if scopes is None:
            scopes = ["openid", "email", "profile"]

        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "scope": " ".join(scopes),
            "state": state,
            "access_type": "online",
            "prompt": "select_account",
        }

        return f"{self.AUTH_URI}?{urlencode(params)}"

    def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """Authorization CodeをTokenに交換

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
            GoogleOAuthError: トークン交換失敗
        """
        if not self.client_secret:
            raise GoogleOAuthError("Client Secret not configured")

        token_data = {
            "code": code,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
        }

        try:
            response = requests.post(
                self.TOKEN_URI,
                data=token_data,
                timeout=10,
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            raise GoogleOAuthError(f"Token exchange failed: {str(e)}")

    def get_user_info(self, access_token: str) -> Dict[str, Any]:
        """Access Tokenからユーザー情報を取得

        Args:
            access_token: Access Token

        Returns:
            ユーザー情報 {
                "id": str,
                "email": str,
                "verified_email": bool,
                "name": str,
                "picture": str
            }

        Raises:
            GoogleOAuthError: ユーザー情報取得失敗
        """
        try:
            response = requests.get(
                self.USERINFO_URI,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            raise GoogleOAuthError(f"User info fetch failed: {str(e)}")
