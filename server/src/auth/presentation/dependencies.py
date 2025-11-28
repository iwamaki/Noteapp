# @file dependencies.py
# @summary FastAPI認証Dependency
# @responsibility APIエンドポイントのデバイスID認証・トークン認証

import re

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from src.auth.application import AuthService, TokenType, verify_token
from src.auth.token_blacklist_manager import get_blacklist_manager
from src.billing.infrastructure import get_db
from src.core.logger import logger

# HTTPベアラー認証のスキーマ
security = HTTPBearer()
# オプショナル認証用（トークンがなくてもエラーにならない）
security_optional = HTTPBearer(auto_error=False)


async def verify_token_auth(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> str:
    """
    JWTトークンを検証し、user_idを返す（新しい認証方式）

    Args:
        credentials: Authorizationヘッダーから取得したトークン
        db: データベースセッション

    Returns:
        user_id: 認証されたユーザーID

    Raises:
        HTTPException: 認証失敗時（401 Unauthorized）
    """
    token = credentials.credentials

    # トークンがブラックリストに含まれているかチェック
    blacklist_manager = get_blacklist_manager()
    if blacklist_manager.is_blacklisted(token):
        logger.warning(
            "Authentication failed: Token has been revoked (logged out)",
            extra={"category": "auth"}
        )
        raise HTTPException(
            status_code=401,
            detail="Token has been revoked. Please login again."
        )

    # トークン検証
    payload = verify_token(token, TokenType.ACCESS)

    if not payload:
        logger.warning(
            "Authentication failed: Invalid or expired token",
            extra={"category": "auth"}
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token. Please login again."
        )

    user_id = payload.get("sub")
    if not user_id:
        logger.warning(
            "Authentication failed: Missing user_id in token",
            extra={"category": "auth"}
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload"
        )

    logger.debug(
        "Token authentication successful",
        extra={"category": "auth", "user_id": user_id}
    )

    return user_id


async def verify_token_auth_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_optional),
    db: Session = Depends(get_db)
) -> str | None:
    """
    JWTトークンを検証し、user_idを返す（オプショナル認証）

    トークンがない場合やトークンが無効な場合はNoneを返す（エラーにならない）。
    エラーログなど、認証がある場合はuser_idを紐付けたいが、
    認証がない場合でも動作させたいAPIで使用。

    Args:
        credentials: Authorizationヘッダーから取得したトークン（なくてもOK）
        db: データベースセッション

    Returns:
        user_id: 認証されたユーザーID、または認証がない場合はNone
    """
    if not credentials:
        logger.debug(
            "Optional auth: No credentials provided",
            extra={"category": "auth"}
        )
        return None

    token = credentials.credentials

    # トークンがブラックリストに含まれているかチェック
    blacklist_manager = get_blacklist_manager()
    if blacklist_manager.is_blacklisted(token):
        logger.debug(
            "Optional auth: Token has been revoked",
            extra={"category": "auth"}
        )
        return None

    # トークン検証
    payload = verify_token(token, TokenType.ACCESS)

    if not payload:
        logger.debug(
            "Optional auth: Invalid or expired token",
            extra={"category": "auth"}
        )
        return None

    user_id = payload.get("sub")
    if not user_id:
        logger.debug(
            "Optional auth: Missing user_id in token",
            extra={"category": "auth"}
        )
        return None

    logger.debug(
        "Optional auth: Token authentication successful",
        extra={"category": "auth", "user_id": user_id}
    )

    return user_id


async def verify_user(
    device_id: str | None = Header(None, alias="X-Device-ID"),
    db: Session = Depends(get_db)
) -> str:
    """
    デバイスIDを検証し、user_idを返す

    Args:
        device_id: リクエストヘッダー X-Device-ID
        db: データベースセッション

    Returns:
        user_id: 認証されたユーザーID

    Raises:
        HTTPException: 認証失敗時（401 Unauthorized）
    """
    if not device_id:
        logger.warning(
            "Authentication failed: Missing X-Device-ID header",
            extra={"category": "auth"}
        )
        raise HTTPException(
            status_code=401,
            detail="Device ID required. Please provide X-Device-ID header."
        )

    # デバイスIDの形式チェック（UUID v4）
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    if not re.match(uuid_pattern, device_id, re.IGNORECASE):
        logger.warning(
            "Authentication failed: Invalid device ID format",
            extra={"category": "auth", "device_id": device_id[:20] + "..."}
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid device ID format"
        )

    auth_service = AuthService(db)
    user_id = auth_service.get_user_id_by_device(device_id)

    if not user_id:
        logger.warning(
            "Authentication failed: Device not found",
            extra={"category": "auth", "device_id": device_id}
        )
        raise HTTPException(
            status_code=401,
            detail="Invalid device ID. Please register your device first."
        )

    logger.debug(
        "Authentication successful",
        extra={"category": "auth", "device_id": device_id, "user_id": user_id}
    )

    return user_id
