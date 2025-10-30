# @file main.py
# @summary アプリケーションのメインエントリポイント。FastAPIアプリを初期化し、ルーターを結合します。
# @responsibility FastAPIアプリケーションのインスタンス化、CORSミドルウェアの設定、および各ルーターのインクルードを行います。
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from src.llm.routers import chat_router
from src.llm.routers import llm_providers_router
from src.llm.routers import tools_router
from src.api.websocket import manager
from src.core.logger import logger

app = FastAPI(title="LLM File App API")

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
            "websocket": "/ws/{client_id}"
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