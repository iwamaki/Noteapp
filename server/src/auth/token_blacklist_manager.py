# @file token_blacklist_manager.py
# @summary トークンブラックリスト管理
# @responsibility ログアウト時のトークン無効化を管理する

import hashlib
import os
import time
from abc import ABC, abstractmethod
from datetime import datetime, timedelta

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

    @staticmethod
    def _hash_token(token: str) -> str:
        """トークンをSHA-256でハッシュ化（セキュリティ向上）"""
        return hashlib.sha256(token.encode('utf-8')).hexdigest()


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


class PostgresTokenBlacklist(TokenBlacklistManager):
    """
    PostgreSQL ベースのトークンブラックリスト（本番用）

    マルチインスタンス環境で動作可能。
    Redisを使わずにPostgreSQLで共有ブラックリストを管理。
    """

    def __init__(self):
        """初期化"""
        logger.info(
            "Using PostgresTokenBlacklist for token management (multi-instance ready)",
            extra={"category": "auth"}
        )
        # 起動時に期限切れレコードをクリーンアップ
        self._cleanup_expired()

    def _get_session(self):
        """DBセッションを取得"""
        from src.data.database import SessionLocal
        return SessionLocal()

    def add_to_blacklist(self, token: str, expires_in_seconds: int) -> None:
        """
        トークンをブラックリストに追加（PostgreSQL に保存）

        Args:
            token: ブラックリストに追加するトークン
            expires_in_seconds: トークンの残り有効期限（秒）
        """
        from src.data.models import TokenBlacklist

        token_hash = self._hash_token(token)
        expires_at = datetime.now() + timedelta(seconds=expires_in_seconds)

        session = self._get_session()
        try:
            # 既存のエントリがあれば更新、なければ追加
            existing = session.query(TokenBlacklist).filter_by(
                token_hash=token_hash
            ).first()

            if existing:
                existing.expires_at = expires_at
            else:
                blacklist_entry = TokenBlacklist(
                    token_hash=token_hash,
                    expires_at=expires_at
                )
                session.add(blacklist_entry)

            session.commit()
            logger.debug(
                "Token added to blacklist (PostgreSQL)",
                extra={"category": "auth", "expires_in": expires_in_seconds}
            )

        except Exception as e:
            session.rollback()
            logger.error(
                f"Failed to add token to PostgreSQL blacklist: {e}",
                extra={"category": "auth"}
            )
            raise
        finally:
            session.close()

    def is_blacklisted(self, token: str) -> bool:
        """
        トークンがブラックリストに含まれているかチェック

        Args:
            token: チェックするトークン

        Returns:
            ブラックリストに含まれている場合True
        """
        from src.data.models import TokenBlacklist

        token_hash = self._hash_token(token)

        session = self._get_session()
        try:
            # ハッシュで検索し、有効期限内のものがあるかチェック
            entry = session.query(TokenBlacklist).filter(
                TokenBlacklist.token_hash == token_hash,
                TokenBlacklist.expires_at > datetime.now()
            ).first()

            return entry is not None

        except Exception as e:
            logger.error(
                f"Failed to check token in PostgreSQL blacklist: {e}",
                extra={"category": "auth"}
            )
            # エラー時は安全側に倒してFalseを返す（ブロックしない）
            return False
        finally:
            session.close()

    def _cleanup_expired(self) -> None:
        """期限切れのブラックリストエントリを削除"""
        from src.data.models import TokenBlacklist

        session = self._get_session()
        try:
            deleted_count = session.query(TokenBlacklist).filter(
                TokenBlacklist.expires_at < datetime.now()
            ).delete()

            if deleted_count > 0:
                session.commit()
                logger.info(
                    f"Cleaned up {deleted_count} expired blacklist entries (PostgreSQL)",
                    extra={"category": "auth"}
                )
            else:
                session.commit()

        except Exception as e:
            session.rollback()
            logger.error(
                f"Failed to cleanup expired blacklist entries: {e}",
                extra={"category": "auth"}
            )
        finally:
            session.close()


# グローバルインスタンス
_blacklist_manager: TokenBlacklistManager | None = None


def get_blacklist_manager() -> TokenBlacklistManager:
    """
    トークンブラックリストマネージャーのシングルトンインスタンスを取得

    環境変数 TOKEN_BLACKLIST_STORAGE で切り替え:
    - "postgres" または未設定: PostgresTokenBlacklist を使用（本番環境推奨、マルチインスタンス対応）
    - "redis": RedisTokenBlacklist を使用（Redis利用時）
    - "memory": InMemoryTokenBlacklist を使用（開発環境のみ、シングルインスタンス限定）

    Returns:
        TokenBlacklistManager インスタンス
    """
    global _blacklist_manager

    if _blacklist_manager is not None:
        return _blacklist_manager

    storage_type = os.getenv("TOKEN_BLACKLIST_STORAGE", "postgres").lower()

    if storage_type == "redis":
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
                "Falling back to PostgresTokenBlacklist.",
                extra={"category": "auth"}
            )
            _blacklist_manager = PostgresTokenBlacklist()

    elif storage_type == "memory":
        logger.warning(
            "Using InMemoryTokenBlacklist. NOT suitable for multi-instance deployments.",
            extra={"category": "auth"}
        )
        _blacklist_manager = InMemoryTokenBlacklist()

    else:
        # デフォルト: PostgresTokenBlacklist（マルチインスタンス対応）
        try:
            _blacklist_manager = PostgresTokenBlacklist()
        except Exception as e:
            logger.error(
                f"Failed to initialize PostgresTokenBlacklist: {e}. "
                "Falling back to InMemoryTokenBlacklist.",
                extra={"category": "auth"}
            )
            _blacklist_manager = InMemoryTokenBlacklist()

    return _blacklist_manager
