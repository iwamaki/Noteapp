"""
@file logger.py
@summary 構造化ロギング設定
@responsibility アプリケーション全体で使用する構造化ログの設定を提供
"""

import logging
import sys
import json
from datetime import datetime
from typing import Any, Optional, Dict
from functools import lru_cache


class JsonFormatter(logging.Formatter):
    """JSON形式でログを出力するフォーマッタ

    Cloud Loggingやログ分析ツールとの統合を容易にする。
    """

    def __init__(self, include_trace: bool = False):
        """
        Args:
            include_trace: トレース情報（ファイル名、行番号）を含めるか
        """
        super().__init__()
        self.include_trace = include_trace

    def default_serializer(self, obj: Any) -> str:
        """JSONシリアル化できないオブジェクトを文字列に変換

        Args:
            obj: シリアル化対象のオブジェクト

        Returns:
            文字列表現
        """
        if isinstance(obj, datetime):
            return obj.isoformat()
        return str(obj)

    def format(self, record: logging.LogRecord) -> str:
        """ログレコードをJSON形式にフォーマット

        Args:
            record: ログレコード

        Returns:
            JSON文字列
        """
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "severity": record.levelname,
            "logger": record.name,
        }

        # メッセージがdict型ならそのままマージ（構造化ログ）
        if isinstance(record.msg, dict):
            log_data.update(record.msg)
        else:
            log_data["message"] = record.getMessage()

        # トレース情報（デバッグ用）
        if self.include_trace:
            log_data["trace"] = {
                "filename": record.filename,
                "line_number": record.lineno,
                "function": record.funcName,
            }

        # 例外情報
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # 追加のコンテキスト情報
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "trace_id"):
            log_data["trace_id"] = record.trace_id

        return json.dumps(
            log_data,
            ensure_ascii=False,
            default=self.default_serializer
        )


class TextFormatter(logging.Formatter):
    """人間が読みやすいテキスト形式のフォーマッタ"""

    def __init__(self):
        super().__init__(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )


def setup_logger(
    log_level: str = "INFO",
    log_format: str = "json",
    include_trace: bool = False,
) -> logging.Logger:
    """アプリケーションのロガーを設定

    Args:
        log_level: ログレベル（DEBUG, INFO, WARNING, ERROR, CRITICAL）
        log_format: ログ形式（json, text）
        include_trace: トレース情報を含めるか

    Returns:
        設定済みのロガー
    """
    # ルートロガーを取得
    logger = logging.getLogger()
    logger.setLevel(log_level.upper())

    # 既存のハンドラをすべて削除
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    # 標準出力にログを出力
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(log_level.upper())

    # フォーマッタを選択
    if log_format.lower() == "json":
        formatter = JsonFormatter(include_trace=include_trace)
    else:
        formatter = TextFormatter()

    handler.setFormatter(formatter)
    logger.addHandler(handler)

    # サードパーティライブラリのログレベルを下げる
    for noisy_logger in ["httpx", "httpcore", "openai", "langchain", "urllib3", "google"]:
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)

    return logger


def _sanitize_log_content(
    content: Any,
    max_depth: int = 3,
    current_depth: int = 0,
    max_list_items: int = 10,
    max_string_length: int = 1000,
) -> Any:
    """ログ出力から機密情報を除外し、サイズを制限する

    Args:
        content: サニタイズ対象のコンテンツ
        max_depth: 最大再帰深度
        current_depth: 現在の深度
        max_list_items: リストの最大要素数
        max_string_length: 文字列の最大長

    Returns:
        サニタイズされたコンテンツ
    """
    # 深度制限
    if current_depth > max_depth:
        return "[max depth reached]"

    # 除外したいフィールド（機密情報）
    excluded_fields = {
        'signature', 'extras', 'api_key', 'token', 'password',
        'secret', 'credential', 'authorization', 'auth',
        'jwt', 'access_token', 'refresh_token'
    }

    if isinstance(content, dict):
        sanitized = {}
        for key, value in content.items():
            # 除外フィールドはスキップ
            if any(excluded in key.lower() for excluded in excluded_fields):
                sanitized[key] = "[REDACTED]"
                continue
            # 再帰的にサニタイズ
            sanitized[key] = _sanitize_log_content(
                value, max_depth, current_depth + 1,
                max_list_items, max_string_length
            )
        return sanitized

    elif isinstance(content, list):
        # リストの場合は各要素をサニタイズ（最大件数まで）
        if len(content) > max_list_items:
            sanitized_items = [
                _sanitize_log_content(
                    item, max_depth, current_depth + 1,
                    max_list_items, max_string_length
                )
                for item in content[:max_list_items]
            ]
            sanitized_items.append(f"... [{len(content) - max_list_items} more items]")
            return sanitized_items
        return [
            _sanitize_log_content(
                item, max_depth, current_depth + 1,
                max_list_items, max_string_length
            )
            for item in content
        ]

    elif isinstance(content, str):
        # 長い文字列は切り詰め
        if len(content) > max_string_length:
            return content[:max_string_length] + f"... [truncated, total {len(content)} chars]"
        return content

    else:
        # その他の型はそのまま返す（数値、bool、Noneなど）
        return content


def log_structured(
    logger: logging.Logger,
    level: str,
    message: str,
    **kwargs: Any
) -> None:
    """構造化ログを出力

    Args:
        logger: ロガーインスタンス
        level: ログレベル（debug, info, warning, error, critical）
        message: ログメッセージ
        **kwargs: 追加のログコンテキスト
    """
    log_data = {"message": message}

    # サニタイズして追加
    if kwargs:
        sanitized_kwargs = _sanitize_log_content(kwargs)
        log_data.update(sanitized_kwargs)

    # ログレベルに応じて出力
    log_method = getattr(logger, level.lower())
    log_method(log_data)


def log_llm_interaction(
    provider: str,
    direction: str,
    content: Any,
    metadata: Optional[Dict[str, Any]] = None
) -> None:
    """LLMとのやり取りをログ記録

    Args:
        provider: LLMプロバイダー名（gemini, openai等）
        direction: 通信方向（request, response, streaming等）
        content: ログ出力する内容
        metadata: 追加のメタデータ
    """
    logger = get_logger("llm")

    # コンテンツをサニタイズ
    sanitized_content = _sanitize_log_content(content)

    log_data = {
        "provider": provider,
        "direction": direction,
        "content": sanitized_content,
    }

    if metadata:
        sanitized_metadata = _sanitize_log_content(metadata)
        log_data["metadata"] = sanitized_metadata

    logger.info(log_data)


@lru_cache()
def get_logger(name: str) -> logging.Logger:
    """名前付きロガーを取得

    Args:
        name: ロガー名（通常はモジュール名）

    Returns:
        ロガーインスタンス
    """
    return logging.getLogger(name)


# ==========================================
# グローバルロガー（後で初期化）
# ==========================================
_global_logger: Optional[logging.Logger] = None


def init_logging(
    log_level: str = "INFO",
    log_format: str = "json",
    include_trace: bool = False,
) -> logging.Logger:
    """ロギングシステムを初期化

    Args:
        log_level: ログレベル
        log_format: ログ形式
        include_trace: トレース情報を含めるか

    Returns:
        設定済みロガー
    """
    global _global_logger
    _global_logger = setup_logger(log_level, log_format, include_trace)
    return _global_logger


def get_default_logger() -> logging.Logger:
    """デフォルトロガーを取得

    Returns:
        ロガーインスタンス

    Raises:
        RuntimeError: ロギングが初期化されていない場合
    """
    if _global_logger is None:
        raise RuntimeError(
            "Logging not initialized. Call init_logging() first."
        )
    return _global_logger
