"""
@file main_new.py
@summary 新アーキテクチャのテスト用エントリポイント
@responsibility フェーズ1で作成した基盤の動作確認用アプリケーション

Note:
    このファイルはフェーズ1の基盤コンポーネントの動作確認用です。
    既存のmain.pyと並行して動作させることができます。
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# 新しいインフラストラクチャ
from infrastructure.config.settings import get_settings
from infrastructure.logging.logger import init_logging, get_logger
from infrastructure.database.connection import init_database
from infrastructure.cache.redis_client import init_redis

# 新しい共通コンポーネント
from shared.exceptions.handlers import register_exception_handlers
from shared.middleware.logging_middleware import LoggingMiddleware
from shared.middleware.error_middleware import ErrorMiddleware
from shared.middleware.rate_limit_middleware import RateLimitMiddleware

# 新しいBilling Router (Phase 2)
from presentation.routers.billing_router import router as billing_router

# Settings取得
settings = get_settings()

# ロガー初期化
init_logging(
    log_level=settings.log_level,
    log_format="json" if settings.is_production else "text",
    include_trace=settings.debug,
)
logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションライフサイクル管理"""
    logger.info({
        "event": "application_startup",
        "environment": settings.environment,
        "debug": settings.debug,
    })

    # データベース初期化
    try:
        db_manager = init_database(
            database_url=settings.database_url,
            echo=settings.database_echo,
            pool_size=settings.database_pool_size,
        )
        logger.info({
            "event": "database_initialized",
            "is_sqlite": settings.is_sqlite,
            "is_postgresql": settings.is_postgresql,
        })
    except Exception as e:
        logger.error({
            "event": "database_initialization_failed",
            "error": str(e),
        })
        raise

    # Redis初期化（オプション）
    if settings.redis_url:
        try:
            redis_client = init_redis(
                redis_url=settings.redis_url,
                max_connections=settings.redis_max_connections,
            )
            if redis_client.ping():
                logger.info({"event": "redis_initialized"})
            else:
                logger.warning({"event": "redis_connection_failed"})
        except Exception as e:
            logger.warning({
                "event": "redis_initialization_failed",
                "error": str(e),
                "message": "Continuing without Redis"
            })

    yield

    # シャットダウン処理
    logger.info({"event": "application_shutdown"})


# FastAPIアプリケーション作成
app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    debug=settings.debug,
    lifespan=lifespan,
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# カスタムミドルウェア追加
app.add_middleware(ErrorMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=settings.rate_limit_per_minute,
    enabled=settings.rate_limit_enabled,
)

# 例外ハンドラー登録
register_exception_handlers(app)

# ルーター登録
app.include_router(billing_router)


# ==========================================
# ヘルスチェックエンドポイント
# ==========================================

@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "NoteApp Server - New Architecture",
        "version": "0.1.0",
        "phase": "Phase 2 - Billing Domain Migration Complete",
        "endpoints": {
            "health": "/health",
            "config": "/config",
            "billing": "/api/billing",
        }
    }


@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    health_status = {
        "status": "healthy",
        "environment": settings.environment,
        "database": "connected",
    }

    # Redis接続チェック
    try:
        from infrastructure.cache.redis_client import get_redis
        redis_client = get_redis()
        if redis_client.ping():
            health_status["redis"] = "connected"
        else:
            health_status["redis"] = "disconnected"
    except RuntimeError:
        health_status["redis"] = "not_configured"
    except Exception as e:
        health_status["redis"] = f"error: {str(e)}"

    return health_status


@app.get("/config")
async def config_info():
    """設定情報（機密情報は除く）"""
    return {
        "app_name": settings.app_name,
        "environment": settings.environment,
        "debug": settings.debug,
        "database": {
            "is_sqlite": settings.is_sqlite,
            "is_postgresql": settings.is_postgresql,
        },
        "redis_configured": settings.redis_url is not None,
        "log_level": settings.log_level,
    }


# ==========================================
# テスト用エンドポイント（新しい例外処理のテスト）
# ==========================================

@app.get("/test/exception")
async def test_exception():
    """例外ハンドラーのテスト"""
    from shared.exceptions.base import ValidationError
    raise ValidationError(
        message="This is a test validation error",
        details={"field": "test_field", "value": "invalid"}
    )


@app.get("/test/auth-exception")
async def test_auth_exception():
    """認証例外のテスト"""
    from shared.exceptions.auth_exceptions import InvalidTokenError
    raise InvalidTokenError(message="Test token is invalid")


@app.get("/test/billing-exception")
async def test_billing_exception():
    """課金例外のテスト"""
    from shared.exceptions.billing_exceptions import InsufficientBalanceError
    raise InsufficientBalanceError(
        user_id="test_user",
        required=100,
        available=50
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main_new:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
