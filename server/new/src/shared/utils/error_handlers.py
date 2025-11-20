"""
Shared Utilities - Error Handlers

FastAPI router用の共通エラーハンドリングヘルパー

責務:
- 例外を適切なHTTPExceptionに変換
- 一貫したエラーレスポンスを提供
"""

from fastapi import HTTPException
from src.infrastructure.logging.logger import get_logger
from typing import Any, Callable, TypeVar, Coroutine
from functools import wraps

T = TypeVar('T')
logger = get_logger("error_handlers")


def handle_route_errors(
    func: Callable[..., Coroutine[Any, Any, T]]
) -> Callable[..., Coroutine[Any, Any, T]]:
    """ルートハンドラー用のエラーハンドリングデコレーター

    ValueError -> 400 Bad Request
    Exception -> 500 Internal Server Error

    Usage:
        @router.post("/api/endpoint")
        @handle_route_errors
        async def endpoint(request: Request):
            # Your logic here
            pass
    """
    @wraps(func)
    async def wrapper(*args: Any, **kwargs: Any) -> T:
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            # HTTPExceptionはそのまま再スロー
            raise
        except ValueError as e:
            error_msg = str(e)
            logger.error({
                "event": "validation_error",
                "function": func.__name__,
                "error": error_msg,
            })
            raise HTTPException(status_code=400, detail=error_msg)
        except Exception as e:
            error_msg = str(e)
            logger.error({
                "event": "unexpected_error",
                "function": func.__name__,
                "error": error_msg,
            })
            raise HTTPException(status_code=500, detail=error_msg)

    return wrapper
