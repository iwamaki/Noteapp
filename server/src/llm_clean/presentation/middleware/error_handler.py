# @file error_handlers.py
# @summary FastAPI router用の共通エラーハンドリングヘルパー
# @responsibility 例外を適切なHTTPExceptionに変換し、一貫したエラーレスポンスを提供

from collections.abc import Callable, Coroutine
from functools import wraps
from typing import Any, TypeVar

from fastapi import HTTPException

from src.core.logger import logger

T = TypeVar('T')


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
            logger.error(f"Validation error in {func.__name__}: {error_msg}")
            raise HTTPException(status_code=400, detail=error_msg)
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Unexpected error in {func.__name__}: {error_msg}")
            raise HTTPException(status_code=500, detail=error_msg)

    return wrapper
