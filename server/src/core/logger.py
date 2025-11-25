# @file logger.py
# @summary アプリケーションのロギングを設定します。
# @responsibility ログレベル、フォーマット、および出力先を設定し、アプリケーション全体で利用可能なロガーを提供します。
import json
import logging
import os
import sys
from datetime import datetime
from typing import Any, Literal

# ========================================
# ログカテゴリー定義
# ========================================
# フロントエンド（app/utils/logger.ts）と対応するカテゴリー
#
# | Backend Category | Frontend Category    | Description                    |
# |------------------|---------------------|--------------------------------|
# | auth             | auth                | 認証（OAuth, JWT, デバイス管理）   |
# | billing          | billing, billingApi | 課金・トークン管理                |
# | llm              | llm                 | LLMプロバイダー、ユースケース       |
# | tool             | toolService         | LLMツール（web_search等）         |
# | chat             | chat, chatService   | チャットルーター                  |
# | config           | -                   | 設定・シークレット管理             |
# | websocket        | websocket, clientId | WebSocket通信                  |
# | vectorstore      | rag                 | ベクトルストア操作                |
# | document         | file                | ドキュメント処理                  |
# | startup          | init                | アプリ起動・初期化                |
# | api              | api                 | APIルーター・ミドルウェア          |
# | default          | default             | 未分類（フォールバック）           |
# ========================================
LogCategory = Literal[
    "auth",        # 認証（OAuth, JWT, デバイス管理）
    "billing",     # 課金・トークン管理
    "llm",         # LLMプロバイダー、ユースケース
    "tool",        # LLMツール（web_search, read_file等）
    "chat",        # チャットルーター
    "config",      # 設定・シークレット管理
    "websocket",   # WebSocket通信
    "vectorstore", # ベクトルストア操作
    "document",    # ドキュメント処理
    "startup",     # アプリ起動・初期化
    "api",         # APIルーター・ミドルウェア
    "default",     # 未分類（フォールバック）
]

# 有効なカテゴリーのセット（検証用）
VALID_CATEGORIES: set[str] = {
    "auth", "billing", "llm", "tool", "chat", "config",
    "websocket", "vectorstore", "document", "startup", "api", "default"
}


class JsonFormatter(logging.Formatter):
    """JSONフォーマットでログを出力するフォーマッタ"""

    def default_serializer(self, obj):
        """JSONシリアル化できないオブジェクトを文字列に変換する"""
        return str(obj)

    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name
        }

        # extraパラメータからcategoryを取得（デフォルトは"default"）
        category = getattr(record, 'category', 'default')
        log_data["category"] = category

        # メッセージがすでにdict型ならそのままマージ
        if isinstance(record.msg, dict):
            log_data.update(record.msg)
        else:
            log_data["message"] = record.getMessage()

        # extraパラメータの他のフィールドもマージ（標準フィールドとcategory以外）
        excluded_attrs = {
            'name', 'msg', 'args', 'created', 'filename', 'funcName',
            'levelname', 'levelno', 'lineno', 'module', 'msecs',
            'message', 'pathname', 'process', 'processName',
            'relativeCreated', 'thread', 'threadName', 'exc_info',
            'exc_text', 'stack_info', 'category', 'asctime'
        }

        for key, value in record.__dict__.items():
            if key not in excluded_attrs and not key.startswith('_'):
                log_data[key] = value

        # JSON形式で出力（1行1JSON形式でjq解析を容易に）
        return json.dumps(log_data, ensure_ascii=False, default=self.default_serializer)

def setup_logger():
    """アプリケーションのロガーを設定する"""
    log_level = os.getenv("LOG_LEVEL", "INFO").upper()

    # ルートロガーを取得
    logger = logging.getLogger()
    logger.setLevel(log_level)

    # 既存のハンドラをすべて削除
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)

    # 新しいハンドラを作成
    handler = logging.StreamHandler(sys.stdout)

    # 環境変数でフォーマット選択
    if os.getenv("LOG_FORMAT", "json").lower() == "json":
        formatter = JsonFormatter()
    else:
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    handler.setFormatter(formatter)

    # ハンドラをロガーに追加
    logger.addHandler(handler)

    # ここでライブラリのログレベルをWARNINGに下げる
    for noisy_logger in ["httpx", "httpcore", "openai", "langchain"]:
        logging.getLogger(noisy_logger).setLevel(logging.WARNING)

    return logger

# ロガーをセットアップ
logger = setup_logger()

# 構造化ログ用のヘルパー関数


def _sanitize_log_content(content: Any, max_depth: int = 3, current_depth: int = 0) -> Any:
    """ログ出力から不要な情報を除外する

    Args:
        content: サニタイズ対象のコンテンツ
        max_depth: 最大再帰深度
        current_depth: 現在の深度

    Returns:
        サニタイズされたコンテンツ
    """
    # 深度制限
    if current_depth > max_depth:
        return "[max depth reached]"

    # 除外したいフィールド
    excluded_fields = {'signature', 'extras', 'api_key', 'token', 'password'}

    if isinstance(content, dict):
        sanitized = {}
        for key, value in content.items():
            # 除外フィールドはスキップ
            if key in excluded_fields:
                continue
            # 再帰的にサニタイズ
            sanitized[key] = _sanitize_log_content(value, max_depth, current_depth + 1)
        return sanitized

    elif isinstance(content, list):
        # リストの場合は各要素をサニタイズ（最大10要素まで）
        if len(content) > 10:
            return [_sanitize_log_content(item, max_depth, current_depth + 1) for item in content[:10]] + ["... truncated"]
        return [_sanitize_log_content(item, max_depth, current_depth + 1) for item in content]

    elif isinstance(content, str):
        # 長い文字列は切り詰め
        if len(content) > 1000:
            return content[:1000] + "... [truncated]"
        return content

    else:
        # その他の型はそのまま返す（数値、bool、Noneなど）
        return content


def log_llm_raw(provider: str, direction: str, content: str | dict[str, Any], metadata: dict[str, Any] | None = None):
    """LLMとの生のやり取りを詳細にログ記録

    Args:
        provider: LLMプロバイダー名
        direction: 通信方向（agent_request, agent_response など）
        content: ログ出力する内容
        metadata: 追加のメタデータ
    """
    # コンテンツをサニタイズ
    sanitized_content = _sanitize_log_content(content)

    log_data = {
        "provider": provider,
        "direction": direction,
        "raw_content": sanitized_content
    }
    if metadata:
        sanitized_metadata = _sanitize_log_content(metadata)
        log_data.update(sanitized_metadata)

    logger.info(log_data)
