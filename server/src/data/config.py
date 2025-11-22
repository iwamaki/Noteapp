"""データベース設定"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class DatabaseSettings(BaseSettings):
    """データベース設定"""
    database_url: str
    database_echo: bool = False
    database_pool_size: int = 10
    database_max_overflow: int = 20
    database_pool_timeout: int = 30
    database_pool_recycle: int = 3600

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # .envの他のフィールドを無視


@lru_cache()
def get_database_settings() -> DatabaseSettings:
    return DatabaseSettings()
