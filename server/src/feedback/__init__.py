# @file __init__.py
# @summary フィードバックモジュール
# @responsibility フィードバック機能のエクスポート

from src.feedback.presentation.router import router as feedback_router

__all__ = ['feedback_router']
