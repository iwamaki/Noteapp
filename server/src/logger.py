# @file logger.py
# @summary アプリケーションのロギングを設定します。
# @responsibility ログレベル、フォーマット、および出力先を設定し、アプリケーション全体で利用可能なロガーを提供します。
import logging
import os
import sys
import json
from datetime import datetime
from typing import Union, Dict, Any, Optional

class JsonFormatter(logging.Formatter):
    """JSONフォーマットでログを出力するフォーマッタ"""
    
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name
        }
        
        # メッセージがすでにdict型ならそのままマージ
        if isinstance(record.msg, dict):
            log_data.update(record.msg)
        else:
            log_data["message"] = record.getMessage()
            
        # JSON形式を読みやすいようにインデントして出力
        return json.dumps(log_data, ensure_ascii=False, indent=2)

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


def log_llm_raw(provider: str, direction: str, content: Union[str, Dict[str, Any]], metadata: Optional[Dict[str, Any]] = None):
    """LLMとの生のやり取りを詳細にログ記録"""
    log_data = {
        "provider": provider,
        "direction": direction,
        "raw_content": content
    }
    if metadata:
        log_data.update(metadata)
    
    logger.info(log_data)
