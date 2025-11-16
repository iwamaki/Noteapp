# @file jwt_utils.py
# @summary JWT トークン生成・検証ユーティリティ
# @responsibility アクセストークンとリフレッシュトークンの生成・検証を行う

import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from src.core.logger import logger

# JWT設定
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # アクセストークン有効期限: 30分
REFRESH_TOKEN_EXPIRE_DAYS = 30    # リフレッシュトークン有効期限: 30日


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
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": user_id,           # subject: ユーザーID
        "device_id": device_id,   # デバイスID
        "type": TokenType.ACCESS, # トークンタイプ
        "exp": expire,            # 有効期限
        "iat": datetime.utcnow()  # 発行時刻
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    logger.debug(
        "Access token created",
        extra={
            "user_id": user_id,
            "device_id": device_id[:20] + "...",
            "expires_at": expire.isoformat()
        }
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
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": user_id,            # subject: ユーザーID
        "device_id": device_id,    # デバイスID
        "type": TokenType.REFRESH, # トークンタイプ
        "exp": expire,             # 有効期限
        "iat": datetime.utcnow()   # 発行時刻
    }

    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

    logger.debug(
        "Refresh token created",
        extra={
            "user_id": user_id,
            "device_id": device_id[:20] + "...",
            "expires_at": expire.isoformat()
        }
    )

    return token


def verify_token(token: str, expected_type: str = TokenType.ACCESS) -> Optional[Dict[str, Any]]:
    """
    JWTトークンを検証してペイロードを返す

    Args:
        token: JWTトークン
        expected_type: 期待されるトークンタイプ（"access" or "refresh"）

    Returns:
        トークンペイロード（検証失敗時はNone）
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # トークンタイプの検証
        token_type = payload.get("type")
        if token_type != expected_type:
            logger.warning(
                f"Token type mismatch: expected={expected_type}, got={token_type}"
            )
            return None

        # 有効期限の検証（joseが自動で行うが、明示的にログ出力）
        exp = payload.get("exp")
        if exp:
            exp_datetime = datetime.fromtimestamp(exp)
            if exp_datetime < datetime.utcnow():
                logger.warning("Token expired", extra={"expired_at": exp_datetime.isoformat()})
                return None

        logger.debug(
            "Token verified successfully",
            extra={
                "user_id": payload.get("sub"),
                "token_type": token_type
            }
        )

        return payload

    except JWTError as e:
        logger.warning(f"JWT verification failed: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during token verification: {str(e)}")
        return None


def get_user_id_from_token(token: str, token_type: str = TokenType.ACCESS) -> Optional[str]:
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


def get_device_id_from_token(token: str, token_type: str = TokenType.ACCESS) -> Optional[str]:
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
