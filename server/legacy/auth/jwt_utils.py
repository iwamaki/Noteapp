# @file jwt_utils.py
# @summary JWT トークン生成・検証ユーティリティ
# @responsibility アクセストークンとリフレッシュトークンの生成・検証を行う

import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from google.cloud import secretmanager
from google.api_core import exceptions
from src.core.logger import logger

# JWT設定
# 注: SECRET_KEYはSecret Manager → 環境変数の順で取得されます。
# アプリケーション起動時にvalidate_jwt_secret()でバリデーションされます。
SECRET_KEY = ""
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # アクセストークン有効期限: 30分
REFRESH_TOKEN_EXPIRE_DAYS = 30    # リフレッシュトークン有効期限: 30日

# セキュリティ基準
MIN_SECRET_KEY_LENGTH = 32  # 最小シークレットキー長（32文字）


def _get_secret_from_secret_manager(project_id: str, secret_id: str) -> Optional[str]:
    """
    Secret Managerから最新バージョンのシークレットを取得

    Args:
        project_id: GCPプロジェクトID
        secret_id: シークレットID

    Returns:
        シークレット値（取得失敗時はNone）
    """
    try:
        client = secretmanager.SecretManagerServiceClient()
        secret_name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
        response = client.access_secret_version(request={"name": secret_name})
        secret_value = response.payload.data.decode("UTF-8").strip()
        logger.info(f"Successfully loaded JWT_SECRET_KEY from Secret Manager: {secret_id}")
        return secret_value
    except exceptions.NotFound:
        logger.warning(f"Secret '{secret_id}' not found in Secret Manager project '{project_id}'")
    except exceptions.PermissionDenied as e:
        logger.warning(f"Permission denied accessing Secret Manager: {e}")
    except Exception as e:
        logger.warning(f"Error accessing Secret Manager: {e}")
    return None


def load_jwt_secret() -> str:
    """
    JWT_SECRET_KEYをSecret Manager → 環境変数の順で取得

    優先順位:
    1. Secret Manager (本番環境推奨)
    2. 環境変数 JWT_SECRET_KEY (開発環境)

    Returns:
        JWT_SECRET_KEY

    Raises:
        ValueError: シークレットキーが取得できない場合
    """
    global SECRET_KEY

    # 1. Secret Managerから取得を試みる
    gcp_project_id = os.getenv("GCP_PROJECT_ID")
    jwt_secret_id = os.getenv("JWT_SECRET_ID", "JWT_SECRET_KEY")

    if gcp_project_id and os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        secret_value = _get_secret_from_secret_manager(gcp_project_id, jwt_secret_id)
        if secret_value:
            SECRET_KEY = secret_value
            return SECRET_KEY

    # 2. 環境変数からフォールバック（開発環境用）
    env_secret = os.getenv("JWT_SECRET_KEY", "")
    if env_secret:
        logger.info("Using JWT_SECRET_KEY from environment variable (development mode)")
        SECRET_KEY = env_secret
        return SECRET_KEY

    raise ValueError(
        "JWT_SECRET_KEY not found. Please either:\n"
        "  1. Add JWT_SECRET_KEY to Secret Manager (recommended for production)\n"
        "  2. Set JWT_SECRET_KEY environment variable (development only)"
    )


def validate_jwt_secret() -> None:
    """
    JWT_SECRET_KEYをロードして妥当性を検証

    処理フロー:
    1. Secret Manager → 環境変数の順でシークレットキーをロード
    2. 十分な長さがあるかチェック（最低32文字）
    3. デフォルトの脆弱な値を使用していないかチェック

    Raises:
        ValueError: シークレットキーが未設定または脆弱な場合
    """
    # SECRET_KEYをロード（Secret Manager → 環境変数）
    try:
        load_jwt_secret()
    except ValueError as e:
        raise ValueError(f"Failed to load JWT_SECRET_KEY: {e}") from e

    # 長さのチェック
    if len(SECRET_KEY) < MIN_SECRET_KEY_LENGTH:
        raise ValueError(
            f"JWT_SECRET_KEY is too short (minimum {MIN_SECRET_KEY_LENGTH} characters required). "
            f"Current length: {len(SECRET_KEY)} characters."
        )

    # 脆弱なデフォルト値のチェック
    weak_keys = [
        "your-secret-key-change-this-in-production",
        "change-me",
        "secret",
        "password",
        "12345678",
    ]

    if SECRET_KEY in weak_keys or SECRET_KEY.lower() in weak_keys:
        raise ValueError(
            "JWT_SECRET_KEY is using a weak or default value. "
            "Please set a strong, randomly generated secret key."
        )

    logger.info(
        "JWT secret key validated successfully",
        extra={"key_length": len(SECRET_KEY)}
    )


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
