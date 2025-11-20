"""
Presentation Layer - Auth Dependencies

認証用のFastAPI Dependency関数

責務:
- JWTトークンの検証
- ユーザーID抽出
- トークンブラックリストチェック
"""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from src.infrastructure.logging.logger import get_logger

# 旧システムの依存（段階的移行のため一時使用）
from src.auth.jwt_utils import verify_token, TokenType
from src.auth.token_blacklist_manager import get_blacklist_manager

logger = get_logger("auth_dependencies")

# HTTPベアラー認証のスキーマ
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> str:
    """
    JWTトークンを検証し、user_idを返す

    Args:
        credentials: Authorizationヘッダーから取得したトークン

    Returns:
        user_id: 認証されたユーザーID

    Raises:
        HTTPException: 認証失敗時（401 Unauthorized）
    """
    token = credentials.credentials

    # トークンがブラックリストに含まれているかチェック
    blacklist_manager = get_blacklist_manager()
    if blacklist_manager.is_blacklisted(token):
        logger.warning({"event": "token_revoked", "reason": "logged_out"})
        raise HTTPException(
            status_code=401,
            detail="Token has been revoked. Please login again."
        )

    # トークン検証
    payload = verify_token(token, TokenType.ACCESS)

    if not payload:
        logger.warning({"event": "token_invalid", "reason": "expired_or_invalid"})
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token. Please login again."
        )

    user_id = payload.get("sub")
    if not user_id:
        logger.warning({"event": "token_invalid", "reason": "missing_user_id"})
        raise HTTPException(
            status_code=401,
            detail="Invalid token payload."
        )

    logger.debug({"event": "user_authenticated", "user_id": user_id})
    return user_id


# Alias for backward compatibility
verify_token_auth = get_current_user
