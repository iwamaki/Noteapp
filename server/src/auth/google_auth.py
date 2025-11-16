# @file google_auth.py
# @summary Google OAuth2 ID Token検証ユーティリティ
# @responsibility Google ID Tokenの検証とユーザー情報の抽出

import os
from typing import Optional, Dict, Any
from google.auth.transport import requests
from google.oauth2 import id_token
from src.core.logger import logger


class GoogleAuthError(Exception):
    """Google認証エラー"""
    pass


def verify_google_id_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Google ID Tokenを検証してユーザー情報を返す

    Args:
        token: Google ID Token

    Returns:
        ユーザー情報の辞書。検証失敗時はNone。
        {
            "google_id": str,  # Google User ID
            "email": str,
            "email_verified": bool,
            "name": str,       # 表示名
            "picture": str,    # プロフィール画像URL
        }

    Raises:
        GoogleAuthError: トークン検証エラー
    """
    try:
        # 環境変数からGoogle Client IDを取得
        client_id = os.getenv("GOOGLE_CLIENT_ID")
        if not client_id:
            logger.error("GOOGLE_CLIENT_ID environment variable is not set")
            raise GoogleAuthError("Google authentication is not configured")

        # Google ID Tokenを検証
        id_info = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            client_id
        )

        # issuer（発行者）を確認
        if id_info["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
            logger.warning(f"Invalid token issuer: {id_info.get('iss')}")
            raise GoogleAuthError("Invalid token issuer")

        # メール認証を確認
        if not id_info.get("email_verified", False):
            logger.warning("Email not verified")
            raise GoogleAuthError("Email not verified")

        # ユーザー情報を抽出
        user_info = {
            "google_id": id_info["sub"],  # Google User ID
            "email": id_info["email"],
            "email_verified": id_info.get("email_verified", False),
            "name": id_info.get("name"),
            "picture": id_info.get("picture"),
        }

        logger.info(
            "Google ID token verified successfully",
            extra={
                "google_id": user_info["google_id"],
                "email": user_info["email"][:20] + "...",
            }
        )

        return user_info

    except ValueError as e:
        # トークンが無効または期限切れ
        logger.warning(f"Invalid Google ID token: {e}")
        raise GoogleAuthError(f"Invalid or expired token: {str(e)}")

    except Exception as e:
        logger.error(f"Google ID token verification failed: {e}")
        raise GoogleAuthError(f"Token verification failed: {str(e)}")


def get_google_user_info(token: str) -> Dict[str, Any]:
    """
    Google ID Tokenからユーザー情報を取得（検証含む）

    Args:
        token: Google ID Token

    Returns:
        ユーザー情報の辞書

    Raises:
        GoogleAuthError: トークン検証エラー
    """
    user_info = verify_google_id_token(token)
    if not user_info:
        raise GoogleAuthError("Failed to verify Google ID token")

    return user_info
