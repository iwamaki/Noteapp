"""
@file common.py
@summary 共通バリデーター
@responsibility アプリケーション全体で使用するバリデーション関数
"""

import re
from typing import Any


def validate_email(email: str) -> bool:
    """メールアドレスの形式をバリデーション

    Args:
        email: メールアドレス

    Returns:
        有効な形式ならTrue
    """
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))


def validate_positive_int(value: Any) -> bool:
    """正の整数かどうかをバリデーション

    Args:
        value: チェックする値

    Returns:
        正の整数ならTrue
    """
    try:
        int_value = int(value)
        return int_value > 0
    except (ValueError, TypeError):
        return False


def validate_non_negative_int(value: Any) -> bool:
    """非負の整数かどうかをバリデーション

    Args:
        value: チェックする値

    Returns:
        非負の整数ならTrue
    """
    try:
        int_value = int(value)
        return int_value >= 0
    except (ValueError, TypeError):
        return False


def validate_string_length(value: str, min_length: int = 0, max_length: int | None = None) -> bool:
    """文字列の長さをバリデーション

    Args:
        value: チェックする文字列
        min_length: 最小長
        max_length: 最大長（Noneの場合は無制限）

    Returns:
        条件を満たすならTrue
    """
    if not isinstance(value, str):
        return False

    length = len(value)

    if length < min_length:
        return False

    if max_length is not None and length > max_length:
        return False

    return True


def validate_uuid(value: str) -> bool:
    """UUIDの形式をバリデーション

    Args:
        value: チェックする文字列

    Returns:
        有効なUUID形式ならTrue
    """
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(uuid_pattern, value.lower()))
