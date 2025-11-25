# @file token_blacklist_manager.py
# @summary トークンブラックリスト管理
# @responsibility ログアウト時のトークン無効化を管理する

import os
import time
from abc import ABC, abstractmethod

from src.core.logger import logger


class TokenBlacklistManager(ABC):
    """トークンブラックリスト管理の抽象基底クラス"""

    @abstractmethod
    def add_to_blacklist(self, token: str, expires_in_seconds: int) -> None:
        """
        トークンをブラックリストに追加

        Args:
            token: ブラックリストに追加するトークン
            expires_in_seconds: トークンの残り有効期限（秒）
        """
        pass

    @abstractmethod
    def is_blacklisted(self, token: str) -> bool:
        """
        トークンがブラックリストに含まれているかチェック

        Args:
            token: チェックするトークン

        Returns:
            ブラックリストに含まれている場合True
        """
        pass


class InMemoryTokenBlacklist(TokenBlacklistManager):
    """
    インメモリトークンブラックリスト（開発用）

    注意: 本番環境では使用しないでください。
    複数サーバーインスタンスで動作せず、サーバー再起動でデータが消失します。
    """

    def __init__(self):
        # {token: expiry_timestamp}
        self._blacklist: dict[str, float] = {}
        logger.warning(
            "Using InMemoryTokenBlacklist. "
            "NOT suitable for production. Use RedisTokenBlacklist instead.",
            extra={"category": "auth"}
        )

    def add_to_blacklist(self, token: str, expires_in_seconds: int) -> None:
        """トークンをブラックリストに追加"""
        expiry_timestamp = time.time() + expires_in_seconds
        self._blacklist[token] = expiry_timestamp
        logger.debug(
            f"Token added to blacklist (in-memory): expires_in={expires_in_seconds}s",
            extra={"category": "auth"}
        )

        # 古いエントリをクリーンアップ
        self._cleanup_expired()

    def is_blacklisted(self, token: str) -> bool:
        """トークンがブラックリストにあるかチェック"""
        if token not in self._blacklist:
            return False

        # 有効期限切れの場合は削除して False を返す
        expiry = self._blacklist[token]
        if time.time() > expiry:
            del self._blacklist[token]
            return False

        return True

    def _cleanup_expired(self) -> None:
        """有効期限切れのエントリを削除"""
        current_time = time.time()
        expired_tokens = [
            token
            for token, expiry in self._blacklist.items()
            if current_time > expiry
        ]

        for token in expired_tokens:
            del self._blacklist[token]

        if expired_tokens:
            logger.debug(
                f"Cleaned up {len(expired_tokens)} expired blacklist entries",
                extra={"category": "auth"}
            )


class RedisTokenBlacklist(TokenBlacklistManager):
    """
    Redis ベースのトークンブラックリスト（本番用）

    トークンをブラックリストに追加し、有効期限が切れたら自動削除される。
    """

    def __init__(self, redis_client):
        """
        Args:
            redis_client: redis.Redis インスタンス
        """
        self._redis = redis_client
        self._key_prefix = "token_blacklist:"
        logger.info("Using RedisTokenBlacklist for token management", extra={"category": "auth"})

    def add_to_blacklist(self, token: str, expires_in_seconds: int) -> None:
        """
        トークンをブラックリストに追加（Redis に保存）

        Args:
            token: ブラックリストに追加するトークン
            expires_in_seconds: トークンの残り有効期限（秒）
        """
        key = f"{self._key_prefix}{token}"

        # Redis に保存（TTL付き）
        self._redis.setex(key, expires_in_seconds, "1")

        logger.info(
            "Token added to blacklist (Redis)",
            extra={"category": "auth", "expires_in": expires_in_seconds}
        )

    def is_blacklisted(self, token: str) -> bool:
        """
        トークンがブラックリストに含まれているかチェック

        Args:
            token: チェックするトークン

        Returns:
            ブラックリストに含まれている場合True
        """
        key = f"{self._key_prefix}{token}"
        exists = self._redis.exists(key)
        return bool(exists)


# グローバルインスタンス
_blacklist_manager: TokenBlacklistManager | None = None


def get_blacklist_manager() -> TokenBlacklistManager:
    """
    トークンブラックリストマネージャーのシングルトンインスタンスを取得

    環境変数 USE_REDIS_FOR_TOKEN_BLACKLIST が "true" の場合、RedisTokenBlacklist を使用。
    それ以外の場合、InMemoryTokenBlacklist を使用（開発用のみ）。

    Returns:
        TokenBlacklistManager インスタンス
    """
    global _blacklist_manager

    if _blacklist_manager is not None:
        return _blacklist_manager

    use_redis = os.getenv("USE_REDIS_FOR_TOKEN_BLACKLIST", "false").lower() == "true"

    if use_redis:
        try:
            import redis

            redis_host = os.getenv("REDIS_HOST", "localhost")
            redis_port = int(os.getenv("REDIS_PORT", "6379"))
            redis_db = int(os.getenv("REDIS_DB", "0"))

            redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                db=redis_db,
                decode_responses=True,
                socket_connect_timeout=5
            )

            # 接続テスト
            redis_client.ping()

            _blacklist_manager = RedisTokenBlacklist(redis_client)
            logger.info(
                "Token blacklist initialized with Redis",
                extra={
                    "category": "auth",
                    "host": redis_host,
                    "port": redis_port,
                    "db": redis_db
                }
            )

        except Exception as e:
            logger.error(
                f"Failed to connect to Redis for token blacklist: {e}. "
                "Falling back to InMemoryTokenBlacklist.",
                extra={"category": "auth"}
            )
            _blacklist_manager = InMemoryTokenBlacklist()
    else:
        _blacklist_manager = InMemoryTokenBlacklist()
        logger.info(
            "Token blacklist initialized with in-memory storage (development mode)",
            extra={"category": "auth"}
        )

    return _blacklist_manager
