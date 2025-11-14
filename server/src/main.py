# @file main.py
# @summary アプリケーションのメインエントリポイント。FastAPIアプリを初期化し、ルーターを結合します。
# @responsibility FastAPIアプリケーションのインスタンス化、CORSミドルウェアの設定、および各ルーターのインクルードを行います。
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from src.llm.routers import chat_router
from src.llm.routers import llm_providers_router
from src.llm.routers import tools_router
from src.llm.routers import knowledge_base_router
from src.llm.rag.collection_manager import CollectionManager
from src.llm.rag.cleanup_job import start_cleanup_job, stop_cleanup_job
from src.api.websocket import manager
from src.api import billing_router
from src.auth import router as auth_router
from src.billing.database import init_db
from src.core.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフスパン管理

    起動時とシャットダウン時に実行される処理を定義します。
    """
    # 起動時の処理
    logger.info("Application startup...")

    # Billingデータベースを初期化
    init_db()
    logger.info("Billing database initialized")

    # コレクションマネージャーを初期化
    collection_manager = CollectionManager()

    # クリーンアップジョブを開始（10分間隔）
    await start_cleanup_job(collection_manager, interval_minutes=10)
    logger.info("Cleanup job started")

    yield

    # シャットダウン時の処理
    logger.info("Application shutdown...")
    await stop_cleanup_job()
    logger.info("Cleanup job stopped")


app = FastAPI(
    title="LLM File App API",
    lifespan=lifespan
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 開発環境用。本番環境では適切に設定すること
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーターのインクルード
app.include_router(chat_router.router)
app.include_router(llm_providers_router.router)
app.include_router(tools_router.router)
app.include_router(knowledge_base_router.router)
app.include_router(billing_router.router)
app.include_router(auth_router.router)

# ルートエンドポイント
@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "LLM File App API",
        "version": "1.0.0",
        "endpoints": {
            "chat": "/api/chat",
            "providers": "/api/llm-providers",
            "tools": "/api/tools",
            "health": "/api/health",
            "websocket": "/ws/{client_id}",
            "knowledge_base": "/api/knowledge-base",
            "billing": "/api/billing",
            "auth": "/api/auth"
        }
    }

# WebSocketエンドポイント
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocketエンドポイント

    フロントエンドとの双方向通信を確立します。
    主な用途：
    - バックエンドからフロントエンドへのファイル内容リクエスト
    - フロントエンドからバックエンドへのファイル内容レスポンス

    Args:
        websocket: WebSocketインスタンス
        client_id: クライアントの一意識別子（フロントエンドが生成）
    """
    await manager.connect(websocket, client_id)
    logger.info(f"WebSocket connection established: {client_id}")

    try:
        while True:
            # フロントエンドからのメッセージを待機
            data = await websocket.receive_json()

            # メッセージタイプに応じて処理
            if data.get("type") == "file_content_response":
                # ファイル内容のレスポンス
                request_id = data.get("request_id")
                content = data.get("content")
                error = data.get("error")

                logger.debug(f"Received file_content_response: request_id={request_id}")

                # 保留中のリクエストを解決
                manager.resolve_request(request_id, content, error)

            elif data.get("type") == "search_results_response":
                # 検索結果のレスポンス
                request_id = data.get("request_id")
                results = data.get("results")
                error = data.get("error")

                logger.debug(f"Received search_results_response: request_id={request_id}, results_count={len(results) if results else 0}")

                # 保留中のリクエストを解決
                manager.resolve_request(request_id, results, error)

            elif data.get("type") == "ping":
                # ピングメッセージ（ハートビート用）
                manager.handle_ping(client_id)
                await manager.send_message(client_id, {"type": "pong"})

            else:
                logger.warning(f"Unknown message type: {data.get('type')}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {client_id}")
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {client_id}, {e}")
        manager.disconnect(client_id)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)