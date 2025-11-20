"""
@file error_middleware.py
@summary エラーハンドリングミドルウェア
@responsibility 未処理エラーのキャッチとロギング
"""

from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from infrastructure.logging.logger import get_logger

logger = get_logger("middleware.error")


class ErrorMiddleware(BaseHTTPMiddleware):
    """エラーをキャッチしてロギングするミドルウェア"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Args:
            request: FastAPIリクエスト
            call_next: 次のミドルウェアまたはルートハンドラー

        Returns:
            レスポンス
        """
        try:
            return await call_next(request)

        except Exception as e:
            # エラーを詳細にログ記録
            request_id = getattr(request.state, "request_id", "unknown")

            logger.error({
                "event": "unhandled_exception",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "error_type": type(e).__name__,
                "error_message": str(e),
            }, exc_info=True)

            # エラーを再送出（グローバルエラーハンドラーで処理）
            raise
