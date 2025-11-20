# @file oauth_state_manager.py
# @summary OAuth2 state 管理ユーティリティ
# @responsibility OAuth2 フローの state パラメータを安全に管理

import os
import secrets
import time
import json
from typing import Optional, Dict, Any, Protocol
from src.core.logger import logger


class StateManagerProtocol(Protocol):
    """OAuth State Manager のプロトコル定義"""

    def generate_state(self, device_id: str) -> str:
        """新しい state を生成して保存"""
        ...

    def verify_state(self, state: str) -> Optional[str]:
        """state を検証して device_id を返す"""
        ...

    def get_stats(self) -> Dict[str, int]:
        """統計情報を取得"""
        ...


class OAuthStateManager:
    """
    OAuth2 state パラメータのインメモリ管理

    Note: 本番環境では Redis を使用することを推奨
    """

    def __init__(self, ttl_seconds: int = 300):
        """
        Args:
            ttl_seconds: state の有効期限（秒）デフォルトは5分
        """
        self._states: Dict[str, Dict[str, Any]] = {}
        self._ttl = ttl_seconds

    def generate_state(self, device_id: str) -> str:
        """
        新しい state を生成して保存

        Args:
            device_id: デバイスID

        Returns:
            生成された state 文字列
        """
        # 暗号学的に安全なランダム文字列を生成
        state = secrets.token_urlsafe(32)

        # state とメタデータを保存
        self._states[state] = {
            "device_id": device_id,
            "created_at": time.time(),
            "expires_at": time.time() + self._ttl
        }

        logger.debug(
            f"OAuth state generated: state={state[:10]}..., device_id={device_id[:20]}..."
        )

        # 古い state をクリーンアップ
        self._cleanup_expired()

        return state

    def verify_state(self, state: str) -> Optional[str]:
        """
        state を検証して device_id を返す

        Args:
            state: 検証する state 文字列

        Returns:
            device_id（検証成功時）、None（検証失敗時）
        """
        state_data = self._states.get(state)

        if not state_data:
            logger.warning(f"OAuth state not found: state={state[:10]}...")
            return None

        # 有効期限をチェック
        if time.time() > state_data["expires_at"]:
            logger.warning(f"OAuth state expired: state={state[:10]}...")
            del self._states[state]
            return None

        # state を削除（ワンタイム使用）
        device_id = state_data["device_id"]
        del self._states[state]

        logger.debug(
            f"OAuth state verified: state={state[:10]}..., device_id={device_id[:20]}..."
        )

        return device_id

    def _cleanup_expired(self):
        """期限切れの state を削除"""
        current_time = time.time()
        expired_states = [
            state
            for state, data in self._states.items()
            if data["expires_at"] < current_time
        ]

        for state in expired_states:
            del self._states[state]

        if expired_states:
            logger.debug(f"Cleaned up {len(expired_states)} expired OAuth states")

    def get_stats(self) -> Dict[str, int]:
        """統計情報を取得（デバッグ用）"""
        self._cleanup_expired()
        return {
            "active_states": len(self._states),
            "ttl_seconds": self._ttl
        }


class RedisStateManager:
    """
    OAuth2 state パラメータの Redis ベース管理

    本番環境推奨。マルチインスタンス環境で動作可能。
    """

    def __init__(self, ttl_seconds: int = 300, redis_url: Optional[str] = None):
        """
        Args:
            ttl_seconds: state の有効期限（秒）デフォルトは5分
            redis_url: Redis接続URL（例: redis://localhost:6379/0）
        """
        try:
            import redis
        except ImportError:
            raise ImportError(
                "redis package is required for RedisStateManager. "
                "Install it with: pip install redis"
            )

        self._ttl = ttl_seconds
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")

        # Redis接続を確立
        try:
            self._redis = redis.from_url(
                self._redis_url,
                decode_responses=True,  # 文字列として取得
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # 接続テスト
            self._redis.ping()
            logger.info(f"Redis connection established: {self._redis_url}")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise RuntimeError(f"Redis connection failed: {e}") from e

    def generate_state(self, device_id: str) -> str:
        """
        新しい state を生成して保存

        Args:
            device_id: デバイスID

        Returns:
            生成された state 文字列
        """
        # 暗号学的に安全なランダム文字列を生成
        state = secrets.token_urlsafe(32)

        # state とメタデータを保存
        state_data = {
            "device_id": device_id,
            "created_at": time.time(),
            "expires_at": time.time() + self._ttl
        }

        # Redisに保存（TTL付き）
        key = f"oauth_state:{state}"
        try:
            self._redis.setex(
                key,
                self._ttl,
                json.dumps(state_data)
            )
            logger.debug(
                f"OAuth state generated (Redis): state={state[:10]}..., device_id={device_id[:20]}..."
            )
        except Exception as e:
            logger.error(f"Failed to save state to Redis: {e}")
            raise RuntimeError(f"Failed to save OAuth state: {e}") from e

        return state

    def verify_state(self, state: str) -> Optional[str]:
        """
        state を検証して device_id を返す

        Args:
            state: 検証する state 文字列

        Returns:
            device_id（検証成功時）、None（検証失敗時）
        """
        key = f"oauth_state:{state}"

        try:
            # Redisから取得
            state_data_str = self._redis.get(key)

            if not state_data_str:
                logger.warning(f"OAuth state not found (Redis): state={state[:10]}...")
                return None

            # JSONデコード
            state_data = json.loads(state_data_str)

            # 有効期限をチェック（念のため）
            if time.time() > state_data["expires_at"]:
                logger.warning(f"OAuth state expired (Redis): state={state[:10]}...")
                self._redis.delete(key)
                return None

            # state を削除（ワンタイム使用）
            device_id = state_data["device_id"]
            self._redis.delete(key)

            logger.debug(
                f"OAuth state verified (Redis): state={state[:10]}..., device_id={device_id[:20]}..."
            )

            return device_id

        except Exception as e:
            logger.error(f"Failed to verify state in Redis: {e}")
            return None

    def get_stats(self) -> Dict[str, int]:
        """統計情報を取得（デバッグ用）"""
        try:
            # oauth_state:* パターンのキー数をカウント
            keys = self._redis.keys("oauth_state:*")
            return {
                "active_states": len(keys),
                "ttl_seconds": self._ttl
            }
        except Exception as e:
            logger.error(f"Failed to get stats from Redis: {e}")
            return {
                "active_states": -1,
                "ttl_seconds": self._ttl
            }


# グローバルインスタンス（開発用/本番環境対応）
_state_manager: Optional[StateManagerProtocol] = None


def get_state_manager() -> StateManagerProtocol:
    """
    OAuth state manager のシングルトンインスタンスを取得

    環境変数 OAUTH_STATE_STORAGE で切り替え:
    - "redis": RedisStateManager を使用（本番環境推奨）
    - "memory" または未設定: OAuthStateManager を使用（開発環境のみ）

    Returns:
        StateManagerProtocol: OAuth state manager インスタンス
    """
    global _state_manager

    if _state_manager is not None:
        return _state_manager

    storage_type = os.getenv("OAUTH_STATE_STORAGE", "memory").lower()

    if storage_type == "redis":
        logger.info("Initializing RedisStateManager...")
        try:
            _state_manager = RedisStateManager(ttl_seconds=300)
        except Exception as e:
            logger.error(f"Failed to initialize RedisStateManager: {e}")
            logger.warning("Falling back to in-memory OAuthStateManager")
            _state_manager = OAuthStateManager(ttl_seconds=300)
    else:
        logger.info("Initializing OAuthStateManager (in-memory)...")
        _state_manager = OAuthStateManager(ttl_seconds=300)

    return _state_manager
