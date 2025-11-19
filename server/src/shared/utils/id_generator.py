"""
@file id_generator.py
@summary ID生成ユーティリティ
@responsibility 一意なIDの生成機能を提供
"""

import uuid


def generate_uuid() -> str:
    """UUID v4を生成

    Returns:
        UUID文字列
    """
    return str(uuid.uuid4())


def generate_short_id(prefix: str = "") -> str:
    """短いID生成（最初の8文字のみ）

    Args:
        prefix: IDのプレフィックス

    Returns:
        短いID文字列
    """
    short_uuid = str(uuid.uuid4())[:8]
    return f"{prefix}{short_uuid}" if prefix else short_uuid
