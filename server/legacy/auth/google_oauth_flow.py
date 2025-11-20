# @file google_oauth_flow.py
# @summary Google OAuth2 Authorization Code Flow 実装
# @responsibility Google OAuth2 の認証フロー処理（トークン交換、ユーザー情報取得）

import os
from typing import Any
from urllib.parse import urlencode

import requests

from src.core.logger import logger


class GoogleOAuthFlowError(Exception):
    """Google OAuth フローエラー"""
    pass


def get_google_oauth_config() -> dict[str, str]:
    """Google OAuth2 設定を取得"""
    return {
        "client_id": os.getenv("GOOGLE_WEB_CLIENT_ID", ""),
        "client_secret": os.getenv("GOOGLE_WEB_CLIENT_SECRET", ""),
        "redirect_uri": os.getenv("GOOGLE_OAUTH_REDIRECT_URI", ""),
        "auth_uri": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "userinfo_uri": "https://www.googleapis.com/oauth2/v2/userinfo",
    }


def generate_auth_url(state: str) -> str:
    """
    Google 認証 URL を生成

    Args:
        state: OAuth2 state パラメータ

    Returns:
        Google 認証 URL
    """
    config = get_google_oauth_config()

    if not config["client_id"]:
        raise GoogleOAuthFlowError("GOOGLE_WEB_CLIENT_ID not configured")

    if not config["redirect_uri"]:
        raise GoogleOAuthFlowError("GOOGLE_OAUTH_REDIRECT_URI not configured")

    params = {
        "client_id": config["client_id"],
        "redirect_uri": config["redirect_uri"],
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }

    auth_url = f"{config['auth_uri']}?{urlencode(params)}"

    logger.debug(
        f"Generated Google auth URL: client_id={config['client_id'][:20]}..., "
        f"redirect_uri={config['redirect_uri']}"
    )

    return auth_url


def exchange_code_for_tokens(code: str) -> dict[str, Any]:
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
        GoogleOAuthFlowError: トークン交換失敗
    """
    config = get_google_oauth_config()

    if not config["client_secret"]:
        raise GoogleOAuthFlowError("GOOGLE_WEB_CLIENT_SECRET not configured")

    token_data = {
        "code": code,
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "redirect_uri": config["redirect_uri"],
        "grant_type": "authorization_code",
    }

    try:
        logger.debug("Exchanging authorization code for tokens...")

        response = requests.post(
            config["token_uri"],
            data=token_data,
            timeout=10
        )

        response.raise_for_status()
        tokens = response.json()

        logger.info("Successfully exchanged authorization code for tokens")

        return tokens

    except requests.exceptions.RequestException as e:
        logger.error(f"Failed to exchange authorization code: {e}")
        raise GoogleOAuthFlowError(f"Token exchange failed: {str(e)}") from e


def get_user_info_from_access_token(access_token: str) -> dict[str, Any]:
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
        GoogleOAuthFlowError: ユーザー情報取得失敗
    """
    config = get_google_oauth_config()

    try:
        logger.debug("Fetching user info from Google...")

        response = requests.get(
            config["userinfo_uri"],
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
        raise GoogleOAuthFlowError(f"User info fetch failed: {str(e)}") from e
