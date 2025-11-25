# @file oauth_state_manager.py
# @summary OAuth2 state 管理ユーティリティ
# @responsibility OAuth2 フローの state パラメータを安全に管理

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any, Protocol

from src.core.logger import logger


class StateManagerProtocol(Protocol):
    """OAuth State Manager のプロトコル定義"""

    def generate_state(self, device_id: str) -> str:
        """新しい state を生成して保存"""
        ...

    def verify_state(self, state: str) -> str | None:
        """state を検証して device_id を返す"""
        ...

    def get_stats(self) -> dict[str, int]:
        """統計情報を取得"""
        ...


class HmacStateManager:
    """
    HMAC署名付きステートレスOAuth state管理

    サーバー側で状態を保持せず、stateに必要な情報を埋め込んで署名することで
    マルチインスタンス環境でも動作可能。

    state構造: base64url(payload_json).base64url(hmac_signature)
    payload: {"device_id": "...", "exp": unix_timestamp, "nonce": "random"}
    """

    def __init__(self, ttl_seconds: int = 300, secret_key: str | None = None):
        """
        Args:
            ttl_seconds: state の有効期限（秒）デフォルトは5分
            secret_key: HMAC署名用の秘密鍵（省略時はJWT_SECRET_KEYを使用）
        """
        self._ttl = ttl_seconds
        self._secret_key = secret_key

    def _get_secret_key(self) -> bytes:
        """HMAC署名用の秘密鍵を取得"""
        if self._secret_key:
            return self._secret_key.encode('utf-8')

        # JWT_SECRET_KEYを使用（OAuth state専用の鍵と区別するためプレフィックスを付加）
        from src.auth.infrastructure.external.secret_manager_client import get_jwt_secret
        jwt_secret = get_jwt_secret()
        # OAuth state用にプレフィックスを付けて派生キーを作成
        return f"oauth_state:{jwt_secret}".encode()

    def _base64url_encode(self, data: bytes) -> str:
        """Base64URL エンコード（パディングなし）"""
        return base64.urlsafe_b64encode(data).rstrip(b'=').decode('ascii')

    def _base64url_decode(self, data: str) -> bytes:
        """Base64URL デコード（パディング補完）"""
        # パディングを補完
        padding = 4 - len(data) % 4
        if padding != 4:
            data += '=' * padding
        return base64.urlsafe_b64decode(data)

    def _create_signature(self, payload_json: str) -> str:
        """HMACシグネチャを作成"""
        secret_key = self._get_secret_key()
        signature = hmac.new(
            secret_key,
            payload_json.encode('utf-8'),
            hashlib.sha256
        ).digest()
        return self._base64url_encode(signature)

    def _verify_signature(self, payload_json: str, signature: str) -> bool:
        """HMACシグネチャを検証"""
        expected_signature = self._create_signature(payload_json)
        return hmac.compare_digest(expected_signature, signature)

    def generate_state(self, device_id: str) -> str:
        """
        HMAC署名付きstateを生成

        Args:
            device_id: デバイスID

        Returns:
            署名付きstate文字列
        """
        # ペイロードを作成
        payload = {
            "device_id": device_id,
            "exp": int(time.time()) + self._ttl,
            "nonce": secrets.token_urlsafe(16)  # リプレイ攻撃対策
        }
        payload_json = json.dumps(payload, separators=(',', ':'))

        # Base64エンコード
        payload_encoded = self._base64url_encode(payload_json.encode('utf-8'))

        # HMAC署名を作成
        signature = self._create_signature(payload_json)

        # state = payload.signature
        state = f"{payload_encoded}.{signature}"

        logger.debug(
            f"HMAC OAuth state generated: device_id={device_id[:20]}...",
            extra={"category": "auth"}
        )

        return state

    def verify_state(self, state: str) -> str | None:
        """
        stateを検証してdevice_idを返す

        Args:
            state: 検証するstate文字列

        Returns:
            device_id（検証成功時）、None（検証失敗時）
        """
        try:
            # stateを分割
            parts = state.split('.')
            if len(parts) != 2:
                logger.warning(
                    "Invalid HMAC state format: wrong number of parts",
                    extra={"category": "auth"}
                )
                return None

            payload_encoded, signature = parts

            # ペイロードをデコード
            try:
                payload_json = self._base64url_decode(payload_encoded).decode('utf-8')
                payload = json.loads(payload_json)
            except (ValueError, json.JSONDecodeError) as e:
                logger.warning(
                    f"Invalid HMAC state payload: {e}",
                    extra={"category": "auth"}
                )
                return None

            # 署名を検証
            if not self._verify_signature(payload_json, signature):
                logger.warning(
                    "HMAC state signature verification failed",
                    extra={"category": "auth", "event_type": "security"}
                )
                return None

            # 有効期限を検証
            exp = payload.get("exp", 0)
            if time.time() > exp:
                logger.warning(
                    f"HMAC state expired: exp={exp}",
                    extra={"category": "auth"}
                )
                return None

            device_id = payload.get("device_id")
            if not device_id:
                logger.warning(
                    "HMAC state missing device_id",
                    extra={"category": "auth"}
                )
                return None

            logger.debug(
                f"HMAC OAuth state verified: device_id={device_id[:20]}...",
                extra={"category": "auth"}
            )

            return device_id

        except Exception as e:
            logger.error(
                f"Unexpected error verifying HMAC state: {e}",
                extra={"category": "auth"}
            )
            return None

    def get_stats(self) -> dict[str, int]:
        """統計情報を取得（ステートレスなので常に0）"""
        return {
            "active_states": 0,  # ステートレスなので状態を保持しない
            "ttl_seconds": self._ttl
        }


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
        self._states: dict[str, dict[str, Any]] = {}
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
            f"OAuth state generated: state={state[:10]}..., device_id={device_id[:20]}...",
            extra={"category": "auth"}
        )

        # 古い state をクリーンアップ
        self._cleanup_expired()

        return state

    def verify_state(self, state: str) -> str | None:
        """
        state を検証して device_id を返す

        Args:
            state: 検証する state 文字列

        Returns:
            device_id（検証成功時）、None（検証失敗時）
        """
        state_data = self._states.get(state)

        if not state_data:
            logger.warning(
                f"OAuth state not found: state={state[:10]}...",
                extra={"category": "auth"}
            )
            return None

        # 有効期限をチェック
        if time.time() > state_data["expires_at"]:
            logger.warning(
                f"OAuth state expired: state={state[:10]}...",
                extra={"category": "auth"}
            )
            del self._states[state]
            return None

        # state を削除（ワンタイム使用）
        device_id = state_data["device_id"]
        del self._states[state]

        logger.debug(
            f"OAuth state verified: state={state[:10]}..., device_id={device_id[:20]}...",
            extra={"category": "auth"}
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
            logger.debug(
                f"Cleaned up {len(expired_states)} expired OAuth states",
                extra={"category": "auth"}
            )

    def get_stats(self) -> dict[str, int]:
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

    def __init__(self, ttl_seconds: int = 300, redis_url: str | None = None):
        """
        Args:
            ttl_seconds: state の有効期限（秒）デフォルトは5分
            redis_url: Redis接続URL（例: redis://localhost:6379/0）
        """
        try:
            import redis
        except ImportError as e:
            raise ImportError(
                "redis package is required for RedisStateManager. "
                "Install it with: pip install redis"
            ) from e

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
            logger.info(
                f"Redis connection established: {self._redis_url}",
                extra={"category": "auth"}
            )
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}", extra={"category": "auth"})
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
                f"OAuth state generated (Redis): state={state[:10]}..., device_id={device_id[:20]}...",
                extra={"category": "auth"}
            )
        except Exception as e:
            logger.error(f"Failed to save state to Redis: {e}", extra={"category": "auth"})
            raise RuntimeError(f"Failed to save OAuth state: {e}") from e

        return state

    def verify_state(self, state: str) -> str | None:
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
                logger.warning(
                    f"OAuth state not found (Redis): state={state[:10]}...",
                    extra={"category": "auth"}
                )
                return None

            # JSONデコード
            state_data = json.loads(state_data_str)

            # 有効期限をチェック（念のため）
            if time.time() > state_data["expires_at"]:
                logger.warning(
                    f"OAuth state expired (Redis): state={state[:10]}...",
                    extra={"category": "auth"}
                )
                self._redis.delete(key)
                return None

            # state を削除（ワンタイム使用）
            device_id = state_data["device_id"]
            self._redis.delete(key)

            logger.debug(
                f"OAuth state verified (Redis): state={state[:10]}..., device_id={device_id[:20]}...",
                extra={"category": "auth"}
            )

            return device_id

        except Exception as e:
            logger.error(f"Failed to verify state in Redis: {e}", extra={"category": "auth"})
            return None

    def get_stats(self) -> dict[str, int]:
        """統計情報を取得（デバッグ用）"""
        try:
            # oauth_state:* パターンのキー数をカウント
            keys = self._redis.keys("oauth_state:*")
            return {
                "active_states": len(keys),
                "ttl_seconds": self._ttl
            }
        except Exception as e:
            logger.error(f"Failed to get stats from Redis: {e}", extra={"category": "auth"})
            return {
                "active_states": -1,
                "ttl_seconds": self._ttl
            }


# グローバルインスタンス（開発用/本番環境対応）
_state_manager: StateManagerProtocol | None = None


def get_state_manager() -> StateManagerProtocol:
    """
    OAuth state manager のシングルトンインスタンスを取得

    環境変数 OAUTH_STATE_STORAGE で切り替え:
    - "hmac" または未設定: HmacStateManager を使用（本番環境推奨、マルチインスタンス対応）
    - "redis": RedisStateManager を使用（Redis利用時）
    - "memory": OAuthStateManager を使用（開発環境のみ、シングルインスタンス限定）

    Returns:
        StateManagerProtocol: OAuth state manager インスタンス
    """
    global _state_manager

    if _state_manager is not None:
        return _state_manager

    storage_type = os.getenv("OAUTH_STATE_STORAGE", "hmac").lower()

    if storage_type == "redis":
        logger.info("Initializing RedisStateManager...", extra={"category": "auth"})
        try:
            _state_manager = RedisStateManager(ttl_seconds=300)
        except Exception as e:
            logger.error(
                f"Failed to initialize RedisStateManager: {e}",
                extra={"category": "auth"}
            )
            logger.warning(
                "Falling back to HmacStateManager",
                extra={"category": "auth"}
            )
            _state_manager = HmacStateManager(ttl_seconds=300)
    elif storage_type == "memory":
        logger.warning(
            "Using in-memory OAuthStateManager. NOT suitable for multi-instance deployments.",
            extra={"category": "auth"}
        )
        _state_manager = OAuthStateManager(ttl_seconds=300)
    else:
        # デフォルト: HmacStateManager（ステートレス、マルチインスタンス対応）
        logger.info(
            "Initializing HmacStateManager (stateless, multi-instance ready)",
            extra={"category": "auth"}
        )
        _state_manager = HmacStateManager(ttl_seconds=300)

    return _state_manager
