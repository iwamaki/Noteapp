"""
@file redis_client.py
@summary Redisクライアント管理
@responsibility Redisへの接続とキャッシュ操作を提供
"""

import json
from typing import Any, Optional
import redis
from redis.connection import ConnectionPool


class RedisClient:
    """Redisクライアントのラッパークラス

    接続管理とキャッシュ操作を簡潔にする。
    """

    def __init__(
        self,
        redis_url: str,
        max_connections: int = 50,
        socket_connect_timeout: int = 5,
        socket_timeout: int = 5,
        decode_responses: bool = True,
    ):
        """
        Args:
            redis_url: Redis接続URL（例: redis://localhost:6379/0）
            max_connections: コネクションプールの最大接続数
            socket_connect_timeout: 接続タイムアウト（秒）
            socket_timeout: ソケットタイムアウト（秒）
            decode_responses: レスポンスを自動的にデコードするか
        """
        self.redis_url = redis_url

        # コネクションプール作成
        self.pool = ConnectionPool.from_url(
            redis_url,
            max_connections=max_connections,
            socket_connect_timeout=socket_connect_timeout,
            socket_timeout=socket_timeout,
            decode_responses=decode_responses,
        )

        # Redisクライアント
        self._client: Optional[redis.Redis] = None

    @property
    def client(self) -> redis.Redis:
        """Redisクライアントを取得（遅延初期化）"""
        if self._client is None:
            self._client = redis.Redis(connection_pool=self.pool)
        return self._client

    def ping(self) -> bool:
        """Redis接続をテスト

        Returns:
            接続が成功したらTrue
        """
        try:
            return self.client.ping()
        except redis.ConnectionError:
            return False

    def get(self, key: str) -> Optional[str]:
        """キーから値を取得

        Args:
            key: キー

        Returns:
            値（存在しない場合はNone）
        """
        try:
            return self.client.get(key)
        except redis.RedisError:
            return None

    def set(
        self,
        key: str,
        value: Any,
        ex: Optional[int] = None,
        nx: bool = False,
    ) -> bool:
        """キーに値を設定

        Args:
            key: キー
            value: 値
            ex: 有効期限（秒）
            nx: キーが存在しない場合のみ設定

        Returns:
            設定が成功したらTrue
        """
        try:
            return self.client.set(key, value, ex=ex, nx=nx)
        except redis.RedisError:
            return False

    def get_json(self, key: str) -> Optional[Any]:
        """JSONとしてデシリアライズして取得

        Args:
            key: キー

        Returns:
            デシリアライズされた値（存在しない場合はNone）
        """
        value = self.get(key)
        if value is None:
            return None

        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return None

    def set_json(
        self,
        key: str,
        value: Any,
        ex: Optional[int] = None,
        nx: bool = False,
    ) -> bool:
        """JSON形式でシリアライズして設定

        Args:
            key: キー
            value: 値（JSONシリアライズ可能）
            ex: 有効期限（秒）
            nx: キーが存在しない場合のみ設定

        Returns:
            設定が成功したらTrue
        """
        try:
            json_value = json.dumps(value, ensure_ascii=False)
            return self.set(key, json_value, ex=ex, nx=nx)
        except (TypeError, json.JSONEncodeError):
            return False

    def delete(self, *keys: str) -> int:
        """キーを削除

        Args:
            *keys: 削除するキー（複数指定可能）

        Returns:
            削除されたキーの数
        """
        try:
            return self.client.delete(*keys)
        except redis.RedisError:
            return 0

    def exists(self, *keys: str) -> int:
        """キーが存在するかチェック

        Args:
            *keys: チェックするキー（複数指定可能）

        Returns:
            存在するキーの数
        """
        try:
            return self.client.exists(*keys)
        except redis.RedisError:
            return 0

    def expire(self, key: str, seconds: int) -> bool:
        """キーに有効期限を設定

        Args:
            key: キー
            seconds: 有効期限（秒）

        Returns:
            設定が成功したらTrue
        """
        try:
            return self.client.expire(key, seconds)
        except redis.RedisError:
            return False

    def ttl(self, key: str) -> int:
        """キーの残り有効期限を取得

        Args:
            key: キー

        Returns:
            残り有効期限（秒）、キーが存在しない場合は-2、期限なしの場合は-1
        """
        try:
            return self.client.ttl(key)
        except redis.RedisError:
            return -2

    def incr(self, key: str, amount: int = 1) -> Optional[int]:
        """キーの値をインクリメント（整数）

        Args:
            key: キー
            amount: 増加量

        Returns:
            インクリメント後の値（失敗時はNone）
        """
        try:
            return self.client.incr(key, amount)
        except redis.RedisError:
            return None

    def decr(self, key: str, amount: int = 1) -> Optional[int]:
        """キーの値をデクリメント（整数）

        Args:
            key: キー
            amount: 減少量

        Returns:
            デクリメント後の値（失敗時はNone）
        """
        try:
            return self.client.decr(key, amount)
        except redis.RedisError:
            return None

    def sadd(self, key: str, *members: str) -> int:
        """セットにメンバーを追加

        Args:
            key: キー
            *members: 追加するメンバー

        Returns:
            追加されたメンバーの数
        """
        try:
            return self.client.sadd(key, *members)
        except redis.RedisError:
            return 0

    def srem(self, key: str, *members: str) -> int:
        """セットからメンバーを削除

        Args:
            key: キー
            *members: 削除するメンバー

        Returns:
            削除されたメンバーの数
        """
        try:
            return self.client.srem(key, *members)
        except redis.RedisError:
            return 0

    def smembers(self, key: str) -> set:
        """セットの全メンバーを取得

        Args:
            key: キー

        Returns:
            セットのメンバー
        """
        try:
            return self.client.smembers(key)
        except redis.RedisError:
            return set()

    def sismember(self, key: str, member: str) -> bool:
        """セットにメンバーが存在するかチェック

        Args:
            key: キー
            member: チェックするメンバー

        Returns:
            メンバーが存在したらTrue
        """
        try:
            return self.client.sismember(key, member)
        except redis.RedisError:
            return False

    def close(self) -> None:
        """接続をクローズ"""
        if self._client:
            self._client.close()
        if self.pool:
            self.pool.disconnect()


# ==========================================
# グローバルRedisクライアント（後で初期化）
# ==========================================
_redis_client: Optional[RedisClient] = None


def init_redis(
    redis_url: str,
    max_connections: int = 50,
    socket_connect_timeout: int = 5,
) -> RedisClient:
    """Redisクライアントを初期化

    Args:
        redis_url: Redis接続URL
        max_connections: 最大接続数
        socket_connect_timeout: 接続タイムアウト

    Returns:
        RedisClient: 初期化されたRedisクライアント
    """
    global _redis_client
    _redis_client = RedisClient(
        redis_url,
        max_connections=max_connections,
        socket_connect_timeout=socket_connect_timeout,
    )
    return _redis_client


def get_redis() -> RedisClient:
    """Redisクライアントを取得

    Returns:
        RedisClient: Redisクライアント

    Raises:
        RuntimeError: Redisが初期化されていない場合
    """
    if _redis_client is None:
        raise RuntimeError(
            "Redis not initialized. Call init_redis() first."
        )
    return _redis_client
