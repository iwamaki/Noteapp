"""
@file settings.py
@summary アプリケーション設定管理
@responsibility 環境変数ベースの設定を Pydantic Settings で型安全に管理
"""

from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from .constants import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    DEFAULT_LLM_PROVIDER,
    JWT_ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
)


class Settings(BaseSettings):
    """アプリケーション設定（環境変数ベース）

    環境変数から設定を読み込み、型安全性とバリデーションを提供する。
    .envファイルからも自動的に読み込まれる。
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # 未定義の環境変数を無視
    )

    # ==========================================
    # アプリケーション基本設定
    # ==========================================
    app_name: str = Field(default="NoteApp Server", description="アプリケーション名")
    debug: bool = Field(default=False, description="デバッグモード")
    environment: str = Field(default="development", description="実行環境（development/staging/production）")
    log_level: str = Field(default="INFO", description="ログレベル")

    # ==========================================
    # データベース設定
    # ==========================================
    database_url: str = Field(
        default="sqlite:///./billing.db",
        description="データベース接続URL"
    )
    database_pool_size: int = Field(default=10, description="コネクションプールサイズ")
    database_max_overflow: int = Field(default=20, description="プール超過時の最大接続数")
    database_pool_recycle: int = Field(default=3600, description="接続の再利用時間（秒）")
    database_echo: bool = Field(default=False, description="SQLログ出力")

    # ==========================================
    # Redis設定
    # ==========================================
    redis_url: str | None = Field(default=None, description="Redis接続URL")
    redis_max_connections: int = Field(default=50, description="Redisコネクションプールサイズ")
    redis_socket_connect_timeout: int = Field(default=5, description="Redis接続タイムアウト（秒）")

    # ==========================================
    # GCP設定
    # ==========================================
    gcp_project_id: str | None = Field(default=None, description="GCPプロジェクトID")
    google_application_credentials: str | None = Field(
        default=None,
        description="GCPサービスアカウントキーのパス"
    )

    # ==========================================
    # Secret Manager設定
    # ==========================================
    use_secret_manager: bool = Field(
        default=True,
        description="Secret Managerを使用するか"
    )
    gemini_api_secret_id: str = Field(
        default="GOOGLE_API_KEY",
        description="Gemini APIキーのSecret ID"
    )
    openai_api_secret_id: str = Field(
        default="OPENAI_API_KEY",
        description="OpenAI APIキーのSecret ID"
    )
    google_cse_api_secret_id: str = Field(
        default="GOOGLE_CSE_API_KEY",
        description="Google Custom Search APIキーのSecret ID"
    )
    jwt_secret_key_id: str = Field(
        default="JWT_SECRET_KEY",
        description="JWTシークレットキーのSecret ID"
    )

    # ==========================================
    # 直接指定のAPIキー（Secret Manager不使用の場合）
    # ==========================================
    gemini_api_key: str | None = Field(default=None, description="Gemini APIキー")
    openai_api_key: str | None = Field(default=None, description="OpenAI APIキー")
    google_cse_api_key: str | None = Field(default=None, description="Google CSE APIキー")

    # ==========================================
    # JWT認証設定
    # ==========================================
    jwt_secret_key: str | None = Field(default=None, description="JWTシークレットキー")
    jwt_algorithm: str = Field(default=JWT_ALGORITHM, description="JWTアルゴリズム")
    jwt_access_token_expire_minutes: int = Field(
        default=ACCESS_TOKEN_EXPIRE_MINUTES,
        description="アクセストークン有効期限（分）"
    )
    jwt_refresh_token_expire_days: int = Field(
        default=REFRESH_TOKEN_EXPIRE_DAYS,
        description="リフレッシュトークン有効期限（日）"
    )

    # ==========================================
    # Google OAuth設定
    # ==========================================
    google_client_id: str | None = Field(default=None, description="Google OAuth Client ID")
    google_client_secret: str | None = Field(default=None, description="Google OAuth Client Secret")
    google_redirect_uri: str | None = Field(
        default="http://localhost:8000/auth/google/callback",
        description="Google OAuth Redirect URI"
    )

    # ==========================================
    # LLMプロバイダー設定
    # ==========================================
    default_llm_provider: str = Field(
        default=DEFAULT_LLM_PROVIDER,
        description="デフォルトLLMプロバイダー"
    )

    # ==========================================
    # Google Play IAP設定
    # ==========================================
    google_play_package_name: str | None = Field(
        default=None,
        description="Google Play アプリパッケージ名"
    )

    # ==========================================
    # CORS設定
    # ==========================================
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:5173",
        description="CORSで許可するオリジン（カンマ区切り）"
    )

    # ==========================================
    # レート制限設定
    # ==========================================
    rate_limit_enabled: bool = Field(default=True, description="レート制限を有効化")
    rate_limit_per_minute: int = Field(default=60, description="1分あたりのリクエスト制限")

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """環境値のバリデーション"""
        allowed = ["development", "staging", "production"]
        if v not in allowed:
            raise ValueError(f"environment must be one of {allowed}")
        return v

    @field_validator("log_level")
    @classmethod
    def validate_log_level(cls, v: str) -> str:
        """ログレベルのバリデーション"""
        allowed = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        v_upper = v.upper()
        if v_upper not in allowed:
            raise ValueError(f"log_level must be one of {allowed}")
        return v_upper

    def get_cors_origins_list(self) -> list[str]:
        """CORS設定をリスト形式で取得"""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        """本番環境かどうか"""
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        """開発環境かどうか"""
        return self.environment == "development"

    @property
    def is_sqlite(self) -> bool:
        """SQLiteを使用しているかどうか"""
        return self.database_url.startswith("sqlite")

    @property
    def is_postgresql(self) -> bool:
        """PostgreSQLを使用しているかどうか"""
        return self.database_url.startswith("postgresql")

    def get_database_url_for_alembic(self) -> str:
        """Alembic用のデータベースURL（同期版）

        非同期URLの場合は同期版に変換する。
        """
        url = self.database_url
        if "asyncpg" in url:
            url = url.replace("+asyncpg", "")
        if "aiosqlite" in url:
            url = url.replace("+aiosqlite", "")
        return url


@lru_cache
def get_settings() -> Settings:
    """設定シングルトンを取得

    LRUキャッシュにより、同じインスタンスが返される。

    Returns:
        Settings: アプリケーション設定
    """
    return Settings()


def reload_settings() -> Settings:
    """設定を再読み込み

    テスト時などに設定をリセットしたい場合に使用。

    Returns:
        Settings: 新しいアプリケーション設定
    """
    get_settings.cache_clear()
    return get_settings()
