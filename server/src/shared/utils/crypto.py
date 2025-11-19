"""
@file crypto.py
@summary 暗号化関連ユーティリティ
@responsibility ハッシュ化、トークン生成などの暗号化機能を提供
"""

import hashlib
import secrets
from typing import Optional


def generate_random_token(length: int = 32) -> str:
    """ランダムトークンを生成

    Args:
        length: トークンのバイト長

    Returns:
        16進数文字列のトークン
    """
    return secrets.token_hex(length)


def generate_random_string(length: int = 16) -> str:
    """ランダム文字列を生成（URL-safe）

    Args:
        length: 文字列の長さ（バイト）

    Returns:
        URL-safeなランダム文字列
    """
    return secrets.token_urlsafe(length)


def hash_sha256(data: str, salt: Optional[str] = None) -> str:
    """SHA-256ハッシュを生成

    Args:
        data: ハッシュ化するデータ
        salt: ソルト（オプション）

    Returns:
        16進数文字列のハッシュ値
    """
    if salt:
        data = f"{data}{salt}"

    return hashlib.sha256(data.encode()).hexdigest()


def verify_hash(data: str, hash_value: str, salt: Optional[str] = None) -> bool:
    """ハッシュ値を検証

    Args:
        data: 元のデータ
        hash_value: 検証するハッシュ値
        salt: ソルト（オプション）

    Returns:
        ハッシュが一致すればTrue
    """
    return hash_sha256(data, salt) == hash_value
