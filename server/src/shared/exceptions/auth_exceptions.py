"""
@file auth_exceptions.py
@summary 認証関連例外
@responsibility 認証・認可に関する例外を定義
"""

from typing import Any, Dict, Optional
from .base import AppException
from . import codes


class InvalidTokenError(AppException):
    """トークンが無効"""

    def __init__(self, message: str = "Invalid token", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code=codes.AUTH_INVALID_TOKEN,
            status_code=401,
            details=details,
        )


class TokenExpiredError(AppException):
    """トークンの有効期限切れ"""

    def __init__(self, message: str = "Token expired", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code=codes.AUTH_TOKEN_EXPIRED,
            status_code=401,
            details=details,
        )


class InvalidCredentialsError(AppException):
    """認証情報が無効"""

    def __init__(self, message: str = "Invalid credentials", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code=codes.AUTH_INVALID_CREDENTIALS,
            status_code=401,
            details=details,
        )


class UserNotFoundError(AppException):
    """ユーザーが見つからない"""

    def __init__(self, user_id: str):
        super().__init__(
            message=f"User not found: {user_id}",
            code=codes.AUTH_USER_NOT_FOUND,
            status_code=404,
            details={"user_id": user_id},
        )


class DeviceNotFoundError(AppException):
    """デバイスが見つからない"""

    def __init__(self, device_id: str):
        super().__init__(
            message=f"Device not found: {device_id}",
            code=codes.AUTH_DEVICE_NOT_FOUND,
            status_code=404,
            details={"device_id": device_id},
        )


class OAuthError(AppException):
    """OAuth認証エラー"""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code=codes.AUTH_OAUTH_ERROR,
            status_code=400,
            details=details,
        )


class InvalidStateError(AppException):
    """OAuthステート検証エラー"""

    def __init__(self, message: str = "Invalid OAuth state"):
        super().__init__(
            message=message,
            code=codes.AUTH_INVALID_STATE,
            status_code=400,
        )


class TokenBlacklistedError(AppException):
    """トークンがブラックリストに登録されている"""

    def __init__(self, message: str = "Token has been revoked"):
        super().__init__(
            message=message,
            code=codes.AUTH_TOKEN_BLACKLISTED,
            status_code=401,
        )
