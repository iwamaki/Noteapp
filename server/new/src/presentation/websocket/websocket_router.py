"""
Presentation Layer - WebSocket Router

WebSocketエンドポイントを提供します。

Note:
    旧 src/api/websocket.py のエンドポイント部分を
    新しいアーキテクチャに移行したものです。
"""


from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from src.infrastructure.logging.logger import get_logger
from src.infrastructure.websocket.manager import get_websocket_manager

logger = get_logger("websocket_router")
router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    client_id: str | None = Query(None)
):
    """
    WebSocketエンドポイント

    Args:
        websocket: WebSocketインスタンス
        client_id: クライアントの一意識別子（オプション）

    Note:
        client_idが提供されない場合は、接続を拒否します。
        フロントエンドは必ずclient_idを送信する必要があります。
    """
    if not client_id:
        logger.warning({"event": "websocket_reject", "reason": "missing_client_id"})
        await websocket.close(code=4000, reason="client_id is required")
        return

    # WebSocket接続を受け入れる
    await websocket.accept()

    # マネージャーを取得
    manager = get_websocket_manager()

    # 接続を登録
    await manager.connect(websocket, client_id)

    try:
        while True:
            # クライアントからのメッセージを待つ
            data = await websocket.receive_json()

            message_type = data.get("type")

            if message_type == "ping":
                # ハートビート処理
                manager.handle_ping(client_id)
                await websocket.send_json({"type": "pong"})

            elif message_type == "file_content_response":
                # ファイル内容のレスポンス
                request_id = data.get("request_id")
                content = data.get("content")
                error = data.get("error")

                if request_id:
                    manager.resolve_request(request_id, content, error)
                else:
                    logger.warning({
                        "event": "missing_request_id",
                        "message_type": message_type
                    })

            elif message_type == "search_results_response":
                # 検索結果のレスポンス
                request_id = data.get("request_id")
                results = data.get("results", [])
                error = data.get("error")

                if request_id:
                    manager.resolve_request(request_id, results, error)
                else:
                    logger.warning({
                        "event": "missing_request_id",
                        "message_type": message_type
                    })

            else:
                logger.warning({
                    "event": "unknown_message_type",
                    "type": message_type
                })

    except WebSocketDisconnect:
        logger.info({
            "event": "websocket_disconnect",
            "client_id": client_id
        })
        manager.disconnect(client_id)

    except Exception as e:
        logger.error({
            "event": "websocket_error",
            "client_id": client_id,
            "error": str(e)
        })
        manager.disconnect(client_id)
