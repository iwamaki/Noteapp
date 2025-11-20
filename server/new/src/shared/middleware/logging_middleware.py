"""
@file logging_middleware.py
@summary ロギングミドルウェア
@responsibility HTTPリクエスト/レスポンスのロギング
"""

import time
import uuid
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from infrastructure.logging.logger import get_logger

logger = get_logger("middleware.logging")


class LoggingMiddleware(BaseHTTPMiddleware):
    """HTTPリクエスト/レスポンスをログ記録するミドルウェア"""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Args:
            request: FastAPIリクエスト
            call_next: 次のミドルウェアまたはルートハンドラー

        Returns:
            レスポンス
        """
        # リクエストID生成
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        # 開始時刻
        start_time = time.time()

        # リクエストログ
        logger.info({
            "event": "request_started",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "client": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
        })

        # 次の処理を実行
        try:
            response = await call_next(request)

            # 処理時間
            duration = time.time() - start_time

            # レスポンスログ
            logger.info({
                "event": "request_completed",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2),
            })

            # レスポンスヘッダーにリクエストIDを追加
            response.headers["X-Request-ID"] = request_id

            return response

        except Exception as e:
            # エラーログ
            duration = time.time() - start_time

            logger.error({
                "event": "request_failed",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "error": str(e),
                "duration_ms": round(duration * 1000, 2),
            })

            raise
