# @file __init__.py
# @summary エラーログモジュール
# @responsibility エラーログ機能のエクスポート

from src.error_log.presentation.router import router as error_log_router

__all__ = ['error_log_router']
