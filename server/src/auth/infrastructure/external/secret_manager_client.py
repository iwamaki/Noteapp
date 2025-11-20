# @file secret_manager_client.py
# @summary Secret Manager クライアント
# @responsibility Secret Manager からのシークレット取得とJWT_SECRET_KEYの管理

import os

from google.api_core import exceptions
from google.cloud import secretmanager

from src.auth.infrastructure.config.constants import MIN_SECRET_KEY_LENGTH
from src.core.logger import logger

# グローバル変数としてシークレットキーをキャッシュ
_SECRET_KEY: str | None = None


def _get_secret_from_secret_manager(project_id: str, secret_id: str) -> str | None:
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
    global _SECRET_KEY

    # すでにロード済みの場合はキャッシュを返す
    if _SECRET_KEY:
        return _SECRET_KEY

    # 1. Secret Managerから取得を試みる
    gcp_project_id = os.getenv("GCP_PROJECT_ID")
    jwt_secret_id = os.getenv("JWT_SECRET_ID", "JWT_SECRET_KEY")

    if gcp_project_id and os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        secret_value = _get_secret_from_secret_manager(gcp_project_id, jwt_secret_id)
        if secret_value:
            _SECRET_KEY = secret_value
            return _SECRET_KEY

    # 2. 環境変数からフォールバック（開発環境用）
    env_secret = os.getenv("JWT_SECRET_KEY", "")
    if env_secret:
        logger.info("Using JWT_SECRET_KEY from environment variable (development mode)")
        _SECRET_KEY = env_secret
        return _SECRET_KEY

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
        secret_key = load_jwt_secret()
    except ValueError as e:
        raise ValueError(f"Failed to load JWT_SECRET_KEY: {e}") from e

    # 長さのチェック
    if len(secret_key) < MIN_SECRET_KEY_LENGTH:
        raise ValueError(
            f"JWT_SECRET_KEY is too short (minimum {MIN_SECRET_KEY_LENGTH} characters required). "
            f"Current length: {len(secret_key)} characters."
        )

    # 脆弱なデフォルト値のチェック
    weak_keys = [
        "your-secret-key-change-this-in-production",
        "change-me",
        "secret",
        "password",
        "12345678",
    ]

    if secret_key in weak_keys or secret_key.lower() in weak_keys:
        raise ValueError(
            "JWT_SECRET_KEY is using a weak or default value. "
            "Please set a strong, randomly generated secret key."
        )

    logger.info(
        "JWT secret key validated successfully",
        extra={"key_length": len(secret_key)}
    )


def get_jwt_secret() -> str:
    """
    JWT_SECRET_KEYを取得（キャッシュ済みまたは新規ロード）

    Returns:
        JWT_SECRET_KEY

    Raises:
        ValueError: シークレットキーが取得できない場合
    """
    if _SECRET_KEY:
        return _SECRET_KEY
    return load_jwt_secret()
