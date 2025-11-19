"""
@file cache_decorator.py
@summary キャッシュデコレーター
@responsibility 関数の結果をRedisにキャッシュするデコレーターを提供
"""

import functools
import hashlib
import json
from typing import Any, Callable, Optional

from .redis_client import get_redis


def cache_key_builder(*args, **kwargs) -> str:
    """キャッシュキーを生成

    引数からハッシュ値を生成してキーとする。

    Args:
        *args: 位置引数
        **kwargs: キーワード引数

    Returns:
        キャッシュキー
    """
    # 引数を JSON形式でシリアライズ
    key_data = {
        "args": args,
        "kwargs": kwargs,
    }

    try:
        key_str = json.dumps(key_data, sort_keys=True, ensure_ascii=False)
    except (TypeError, ValueError):
        # シリアライズできない場合はstr()で変換
        key_str = str(key_data)

    # SHA256ハッシュを生成
    hash_value = hashlib.sha256(key_str.encode()).hexdigest()
    return hash_value[:16]  # 最初の16文字を使用


def cached(
    ttl: int = 300,
    prefix: Optional[str] = None,
    key_builder: Optional[Callable] = None,
) -> Callable:
    """関数の結果をキャッシュするデコレーター

    Args:
        ttl: キャッシュの有効期限（秒）
        prefix: キャッシュキーのプレフィックス（関数名がデフォルト）
        key_builder: カスタムキービルダー関数

    Returns:
        デコレーター関数

    Example:
        @cached(ttl=60, prefix="user")
        def get_user_by_id(user_id: str) -> dict:
            # 重い処理...
            return user_data
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Redisクライアント取得
            try:
                redis_client = get_redis()
            except RuntimeError:
                # Redisが初期化されていない場合はキャッシュなしで実行
                return func(*args, **kwargs)

            # キャッシュキー生成
            key_prefix = prefix or func.__name__
            if key_builder:
                key_suffix = key_builder(*args, **kwargs)
            else:
                key_suffix = cache_key_builder(*args, **kwargs)

            cache_key = f"cache:{key_prefix}:{key_suffix}"

            # キャッシュから取得を試みる
            cached_value = redis_client.get_json(cache_key)
            if cached_value is not None:
                return cached_value

            # キャッシュミス：関数を実行
            result = func(*args, **kwargs)

            # 結果をキャッシュ
            redis_client.set_json(cache_key, result, ex=ttl)

            return result

        return wrapper
    return decorator


def cached_async(
    ttl: int = 300,
    prefix: Optional[str] = None,
    key_builder: Optional[Callable] = None,
) -> Callable:
    """非同期関数の結果をキャッシュするデコレーター

    Args:
        ttl: キャッシュの有効期限（秒）
        prefix: キャッシュキーのプレフィックス（関数名がデフォルト）
        key_builder: カスタムキービルダー関数

    Returns:
        デコレーター関数

    Example:
        @cached_async(ttl=60, prefix="user")
        async def get_user_by_id(user_id: str) -> dict:
            # 重い処理...
            return user_data
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Redisクライアント取得
            try:
                redis_client = get_redis()
            except RuntimeError:
                # Redisが初期化されていない場合はキャッシュなしで実行
                return await func(*args, **kwargs)

            # キャッシュキー生成
            key_prefix = prefix or func.__name__
            if key_builder:
                key_suffix = key_builder(*args, **kwargs)
            else:
                key_suffix = cache_key_builder(*args, **kwargs)

            cache_key = f"cache:{key_prefix}:{key_suffix}"

            # キャッシュから取得を試みる
            cached_value = redis_client.get_json(cache_key)
            if cached_value is not None:
                return cached_value

            # キャッシュミス：関数を実行
            result = await func(*args, **kwargs)

            # 結果をキャッシュ
            redis_client.set_json(cache_key, result, ex=ttl)

            return result

        return wrapper
    return decorator


def cache_invalidate(
    prefix: str,
    *args,
    key_builder: Optional[Callable] = None,
    **kwargs
) -> bool:
    """特定のキャッシュを削除

    Args:
        prefix: キャッシュキーのプレフィックス
        *args: キーの引数
        key_builder: カスタムキービルダー関数
        **kwargs: キーのキーワード引数

    Returns:
        削除が成功したらTrue
    """
    try:
        redis_client = get_redis()
    except RuntimeError:
        return False

    # キャッシュキー生成
    if key_builder:
        key_suffix = key_builder(*args, **kwargs)
    else:
        key_suffix = cache_key_builder(*args, **kwargs)

    cache_key = f"cache:{prefix}:{key_suffix}"

    # キャッシュ削除
    return redis_client.delete(cache_key) > 0


def cache_invalidate_pattern(pattern: str) -> int:
    """パターンに一致するキャッシュを一括削除

    Args:
        pattern: キャッシュキーのパターン（例: "cache:user:*"）

    Returns:
        削除されたキーの数
    """
    try:
        redis_client = get_redis()
    except RuntimeError:
        return 0

    # パターンに一致するキーを取得
    try:
        keys = redis_client.client.keys(pattern)
        if not keys:
            return 0

        # 一括削除
        return redis_client.delete(*keys)
    except Exception:
        return 0
