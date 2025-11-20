"""
@file datetime.py
@summary 日時関連ユーティリティ
@responsibility 日時操作の共通関数を提供
"""

from datetime import datetime, timezone, timedelta


def utcnow() -> datetime:
    """現在のUTC時刻を取得

    Returns:
        UTC時刻（timezone-aware）
    """
    return datetime.now(timezone.utc)


def to_utc(dt: datetime) -> datetime:
    """datetimeをUTCに変換

    Args:
        dt: 変換する datetime

    Returns:
        UTC時刻
    """
    if dt.tzinfo is None:
        # naive datetimeの場合はUTCとして扱う
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def from_timestamp(timestamp: int | float) -> datetime:
    """Unix timestampからdatetimeを生成

    Args:
        timestamp: Unix timestamp（秒）

    Returns:
        datetime（UTC）
    """
    return datetime.fromtimestamp(timestamp, tz=timezone.utc)


def to_timestamp(dt: datetime) -> int:
    """datetimeをUnix timestampに変換

    Args:
        dt: datetime

    Returns:
        Unix timestamp（秒）
    """
    return int(to_utc(dt).timestamp())


def add_days(dt: datetime, days: int) -> datetime:
    """日数を加算

    Args:
        dt: 基準となる datetime
        days: 加算する日数（負の値で減算）

    Returns:
        加算後の datetime
    """
    return dt + timedelta(days=days)


def add_hours(dt: datetime, hours: int) -> datetime:
    """時間を加算

    Args:
        dt: 基準となる datetime
        hours: 加算する時間（負の値で減算）

    Returns:
        加算後の datetime
    """
    return dt + timedelta(hours=hours)


def add_minutes(dt: datetime, minutes: int) -> datetime:
    """分を加算

    Args:
        dt: 基準となる datetime
        minutes: 加算する分（負の値で減算）

    Returns:
        加算後の datetime
    """
    return dt + timedelta(minutes=minutes)


def is_expired(dt: datetime) -> bool:
    """datetimeが過去かどうかをチェック

    Args:
        dt: チェックする datetime

    Returns:
        過去の時刻ならTrue
    """
    return to_utc(dt) < utcnow()
