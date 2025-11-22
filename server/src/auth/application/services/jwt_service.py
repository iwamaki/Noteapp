# @file jwt_service.py
# @summary JWT トークン生成・検証サービス
# @responsibility アクセストークンとリフレッシュトークンの生成・検証を行う

from datetime import datetime, timedelta
from typing import Any

from jose import JWTError, jwt

from src.auth.infrastructure.config.constants import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
)
from src.auth.infrastructure.external.secret_manager_client import get_jwt_secret
from src.core.logger import logger


class TokenType:
    """トークンタイプの定数"""

    ACCESS = "access"
    REFRESH = "refresh"


def create_access_token(user_id: str, device_id: str) -> str:
    """
    アクセストークンを生成

    Args:
        user_id: ユーザーID
        device_id: デバイスID

    Returns:
        JWTアクセストークン
    """
    secret_key = get_jwt_secret()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": user_id,  # subject: ユーザーID
        "device_id": device_id,  # デバイスID
        "type": TokenType.ACCESS,  # トークンタイプ
        "exp": expire,  # 有効期限
        "iat": datetime.utcnow(),  # 発行時刻
    }

    token = jwt.encode(payload, secret_key, algorithm=ALGORITHM)

    logger.debug(
        "Access token created",
        extra={
            "user_id": user_id,
            "device_id": device_id[:20] + "...",
            "expires_at": expire.isoformat(),
        },
    )

    return token


def create_refresh_token(user_id: str, device_id: str) -> str:
    """
    リフレッシュトークンを生成

    Args:
        user_id: ユーザーID
        device_id: デバイスID

    Returns:
        JWTリフレッシュトークン
    """
    secret_key = get_jwt_secret()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": user_id,  # subject: ユーザーID
        "device_id": device_id,  # デバイスID
        "type": TokenType.REFRESH,  # トークンタイプ
        "exp": expire,  # 有効期限
        "iat": datetime.utcnow(),  # 発行時刻
    }

    token = jwt.encode(payload, secret_key, algorithm=ALGORITHM)

    logger.debug(
        "Refresh token created",
        extra={
            "user_id": user_id,
            "device_id": device_id[:20] + "...",
            "expires_at": expire.isoformat(),
        },
    )

    return token


def verify_token(token: str, expected_type: str = TokenType.ACCESS) -> dict[str, Any] | None:
    """
    JWTトークンを検証してペイロードを返す

    Args:
        token: JWTトークン
        expected_type: 期待されるトークンタイプ（"access" or "refresh"）

    Returns:
        トークンペイロード（検証失敗時はNone）
    """
    try:
        secret_key = get_jwt_secret()
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])

        # トークンタイプの検証
        token_type = payload.get("type")
        if token_type != expected_type:
            # セキュリティイベントログ: トークンタイプ不一致
            logger.warning(
                "security",
                "Token type mismatch detected",
                extra={
                    "event": "token_type_mismatch",
                    "expected_type": expected_type,
                    "actual_type": token_type,
                    "user_id": payload.get("sub"),
                    "device_id": payload.get("device_id", "")[:8] + "...",
                },
            )
            return None

        # 有効期限の検証（joseが自動で行うが、明示的にログ出力）
        exp = payload.get("exp")
        if exp:
            exp_datetime = datetime.fromtimestamp(exp)
            if exp_datetime < datetime.utcnow():
                # セキュリティイベントログ: トークン期限切れ
                logger.warning(
                    "security",
                    "Expired token detected",
                    extra={
                        "event": "token_expired",
                        "expired_at": exp_datetime.isoformat(),
                        "user_id": payload.get("sub"),
                        "device_id": payload.get("device_id", "")[:8] + "...",
                    },
                )
                return None

        logger.debug(
            "Token verified successfully",
            extra={"user_id": payload.get("sub"), "token_type": token_type},
        )

        return payload

    except JWTError as e:
        # セキュリティイベントログ: JWT検証失敗
        logger.warning(
            "security",
            "Invalid JWT token detected",
            extra={
                "event": "invalid_token",
                "error": str(e),
                "token_prefix": token[:20] + "..." if len(token) > 20 else token,
            },
        )
        return None
    except Exception as e:
        logger.error(f"Unexpected error during token verification: {str(e)}")
        return None


def get_user_id_from_token(token: str, token_type: str = TokenType.ACCESS) -> str | None:
    """
    トークンからユーザーIDを抽出

    Args:
        token: JWTトークン
        token_type: トークンタイプ（"access" or "refresh"）

    Returns:
        ユーザーID（検証失敗時はNone）
    """
    payload = verify_token(token, token_type)
    if payload:
        return payload.get("sub")
    return None


def get_device_id_from_token(token: str, token_type: str = TokenType.ACCESS) -> str | None:
    """
    トークンからデバイスIDを抽出

    Args:
        token: JWTトークン
        token_type: トークンタイプ（"access" or "refresh"）

    Returns:
        デバイスID（検証失敗時はNone）
    """
    payload = verify_token(token, token_type)
    if payload:
        return payload.get("device_id")
    return None
