"""
@file handlers.py
@summary グローバルエラーハンドラー
@responsibility FastAPIアプリケーション全体のエラーハンドリング
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from .base import AppException
from . import codes


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """アプリケーション例外ハンドラー

    Args:
        request: FastAPIリクエスト
        exc: アプリケーション例外

    Returns:
        JSONレスポンス
    """
    return JSONResponse(
        status_code=exc.status_code,
        content=exc.to_dict(),
    )


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    """バリデーションエラーハンドラー

    Args:
        request: FastAPIリクエスト
        exc: バリデーションエラー

    Returns:
        JSONレスポンス
    """
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": codes.VALIDATION_ERROR,
                "message": "Validation error",
                "details": exc.errors(),
            }
        },
    )


async def http_exception_handler(
    request: Request,
    exc: StarletteHTTPException,
) -> JSONResponse:
    """HTTPエラーハンドラー

    Args:
        request: FastAPIリクエスト
        exc: HTTPエラー

    Returns:
        JSONレスポンス
    """
    # ステータスコードに応じてエラーコードをマッピング
    status_to_code = {
        400: codes.BAD_REQUEST,
        401: codes.UNAUTHORIZED,
        403: codes.FORBIDDEN,
        404: codes.NOT_FOUND,
        409: codes.CONFLICT,
        500: codes.INTERNAL_SERVER_ERROR,
    }

    error_code = status_to_code.get(exc.status_code, codes.INTERNAL_SERVER_ERROR)

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": error_code,
                "message": exc.detail,
                "details": {},
            }
        },
    )


async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    """未処理例外ハンドラー

    Args:
        request: FastAPIリクエスト
        exc: 例外

    Returns:
        JSONレスポンス
    """
    # 本番環境では詳細なエラーメッセージを隠す
    import os
    debug = os.getenv("DEBUG", "false").lower() == "true"

    error_message = str(exc) if debug else "Internal server error"

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": codes.INTERNAL_SERVER_ERROR,
                "message": error_message,
                "details": {},
            }
        },
    )


def register_exception_handlers(app) -> None:
    """FastAPIアプリに例外ハンドラーを登録

    Args:
        app: FastAPIアプリケーションインスタンス
    """
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
