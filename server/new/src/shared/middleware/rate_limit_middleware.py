"""
@file rate_limit_middleware.py
@summary レート制限ミドルウェア
@responsibility APIリクエストのレート制限

Note:
    このミドルウェアはRedisベースのレート制限を実装します。
    フェーズ1では基本構造のみ作成します。
"""

from collections.abc import Callable

from fastapi import Request, Response
from infrastructure.cache.redis_client import get_redis
from shared.exceptions import codes
from shared.exceptions.base import AppException
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    """レート制限ミドルウェア"""

    def __init__(
        self,
        app,
        requests_per_minute: int = 60,
        enabled: bool = True,
    ):
        """
        Args:
            app: FastAPIアプリケーション
            requests_per_minute: 1分あたりのリクエスト上限
            enabled: レート制限を有効化するか
        """
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.enabled = enabled

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Args:
            request: FastAPIリクエスト
            call_next: 次のミドルウェアまたはルートハンドラー

        Returns:
            レスポンス
        """
        if not self.enabled:
            return await call_next(request)

        # クライアントIPを取得
        client_ip = request.client.host if request.client else "unknown"

        # レート制限をチェック
        try:
            redis_client = get_redis()

            # レート制限キー（1分間有効）
            rate_limit_key = f"rate_limit:{client_ip}"

            # 現在のリクエスト数を取得
            current_requests = redis_client.incr(rate_limit_key)

            # 初回の場合は有効期限を設定
            if current_requests == 1:
                redis_client.expire(rate_limit_key, 60)

            # レート制限を超えた場合
            if current_requests > self.requests_per_minute:
                raise AppException(
                    message="Too many requests. Please try again later.",
                    code=codes.LLM_RATE_LIMIT_EXCEEDED,
                    status_code=429,
                    details={
                        "limit": self.requests_per_minute,
                        "current": current_requests,
                    },
                )

        except RuntimeError:
            # Redisが初期化されていない場合はスキップ
            pass

        return await call_next(request)
