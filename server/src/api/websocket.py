# @file websocket.py
# @summary WebSocket接続とファイル内容取得リクエストを管理します
# @responsibility WebSocket接続の管理、フロントエンドへのファイル内容リクエスト、レスポンスの待機処理

from fastapi import WebSocket
from typing import Dict, Optional
import asyncio
import uuid
import time
from src.core.logger import logger


class ConnectionManager:
    """
    WebSocket接続を管理し、バックエンドとフロントエンド間の
    双方向通信を実現するマネージャークラス

    責務:
    - WebSocket接続の確立と管理
    - フロントエンドへのファイル内容リクエスト
    - レスポンスの待機とタイムアウト処理
    - エラーハンドリング
    """

    def __init__(self):
        # アクティブなWebSocket接続（client_id -> WebSocket）
        self.active_connections: Dict[str, WebSocket] = {}

        # 保留中のリクエスト（request_id -> Future）
        self.pending_requests: Dict[str, asyncio.Future] = {}

        # クライアントIDとリクエストのマッピング（デバッグ用）
        self.client_requests: Dict[str, set] = {}

        # ハートビート関連（client_id -> 最後のping受信時刻）
        self.last_ping: Dict[str, float] = {}

        # stale接続チェックのバックグラウンドタスク
        self.check_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket, client_id: str):
        """
        WebSocket接続を確立する

        Args:
            websocket: WebSocketインスタンス
            client_id: クライアントの一意識別子
        """
        await websocket.accept()
        self.active_connections[client_id] = websocket
        self.client_requests[client_id] = set()

        # ハートビート用のタイムスタンプを初期化
        self.last_ping[client_id] = time.time()

        logger.info(f"WebSocket connected: client_id={client_id}")

        # 接続チェックタスクが未起動なら開始
        if self.check_task is None or self.check_task.done():
            self.check_task = asyncio.create_task(self.check_stale_connections())

    def disconnect(self, client_id: str):
        """
        WebSocket接続を切断する

        Args:
            client_id: クライアントの一意識別子
        """
        if client_id in self.active_connections:
            del self.active_connections[client_id]

        # このクライアントの保留中リクエストをすべてキャンセル
        if client_id in self.client_requests:
            for request_id in self.client_requests[client_id]:
                if request_id in self.pending_requests:
                    future = self.pending_requests[request_id]
                    if not future.done():
                        future.set_exception(Exception("Client disconnected"))
                    del self.pending_requests[request_id]
            del self.client_requests[client_id]

        # ハートビート情報を削除
        if client_id in self.last_ping:
            del self.last_ping[client_id]

        logger.info(f"WebSocket disconnected: client_id={client_id}")

    async def send_message(self, client_id: str, message: dict):
        """
        特定のクライアントにメッセージを送信する

        Args:
            client_id: クライアントの一意識別子
            message: 送信するメッセージ（辞書形式）
        """
        if client_id in self.active_connections:
            websocket = self.active_connections[client_id]
            try:
                await websocket.send_json(message)
            except Exception as e:
                logger.error(f"Error sending message to {client_id}: {e}")
                self.disconnect(client_id)

    async def request_file_content(
        self,
        client_id: str,
        title: str,
        timeout: int = 30
    ) -> Optional[str]:
        """
        フロントエンドにファイル内容をリクエストする

        このメソッドは、LLMのread_fileツールから呼び出されます。
        フロントエンドにリクエストを送信し、レスポンスを待機します。

        Args:
            client_id: クライアントの一意識別子
            title: 取得するファイルのタイトル
            timeout: タイムアウト時間（秒）

        Returns:
            ファイルの内容、またはNone（タイムアウト/エラーの場合）

        Raises:
            Exception: クライアントが接続されていない場合
            asyncio.TimeoutError: タイムアウトした場合
        """
        if client_id not in self.active_connections:
            raise Exception(f"Client {client_id} is not connected")

        # 一意のリクエストIDを生成
        request_id = str(uuid.uuid4())

        # Futureを作成（レスポンスを待つため）
        future: asyncio.Future = asyncio.Future()
        self.pending_requests[request_id] = future
        self.client_requests[client_id].add(request_id)

        logger.info(f"Requesting file content: client_id={client_id}, title={title}, request_id={request_id}")

        try:
            # フロントエンドにリクエスト送信
            await self.send_message(client_id, {
                "type": "fetch_file_content",
                "request_id": request_id,
                "title": title
            })

            # レスポンスを待つ（タイムアウト付き）
            content = await asyncio.wait_for(future, timeout=timeout)

            logger.info(f"File content received: title={title}, length={len(content) if content else 0}")
            return content

        except asyncio.TimeoutError:
            logger.error(f"Timeout waiting for file content: title={title}, request_id={request_id}")
            raise Exception(f"ファイル '{title}' の取得がタイムアウトしました（{timeout}秒）")

        finally:
            # クリーンアップ
            if request_id in self.pending_requests:
                del self.pending_requests[request_id]
            if client_id in self.client_requests:
                self.client_requests[client_id].discard(request_id)

    def resolve_request(self, request_id: str, content: Optional[str], error: Optional[str] = None):
        """
        フロントエンドからのレスポンスを処理する

        Args:
            request_id: リクエストの一意識別子
            content: ファイルの内容（取得成功時）
            error: エラーメッセージ（取得失敗時）
        """
        if request_id not in self.pending_requests:
            logger.warning(f"Unknown request_id: {request_id}")
            return

        future = self.pending_requests[request_id]

        if not future.done():
            if error:
                logger.error(f"File content request failed: request_id={request_id}, error={error}")
                future.set_exception(Exception(error))
            else:
                logger.debug(f"File content request resolved: request_id={request_id}")
                future.set_result(content)

    def handle_ping(self, client_id: str):
        """
        クライアントからのpingメッセージを処理する

        Args:
            client_id: クライアントの一意識別子
        """
        if client_id in self.active_connections:
            # 最後のping受信時刻を更新
            self.last_ping[client_id] = time.time()
            logger.debug(f"Ping received from client_id={client_id}")

    async def check_stale_connections(self):
        """
        stale接続を定期的にチェックして自動切断する

        60秒以上pingが来ない接続を切断します。
        このメソッドはバックグラウンドタスクとして実行されます。
        """
        logger.info("Stale connection check task started")

        while True:
            try:
                await asyncio.sleep(30)  # 30秒ごとにチェック

                now = time.time()
                stale_clients = []

                # stale接続を検出
                for client_id, last_time in list(self.last_ping.items()):
                    if now - last_time > 60:  # 60秒以上pingがない
                        stale_clients.append(client_id)
                        logger.warning(
                            f"Stale connection detected: client_id={client_id}, "
                            f"last_ping={now - last_time:.1f}s ago"
                        )

                # stale接続を切断
                for client_id in stale_clients:
                    if client_id in self.active_connections:
                        try:
                            websocket = self.active_connections[client_id]
                            await websocket.close(code=1000, reason="Heartbeat timeout")
                            logger.info(f"Closed stale connection: client_id={client_id}")
                        except Exception as e:
                            logger.error(f"Error closing stale connection {client_id}: {e}")
                        finally:
                            self.disconnect(client_id)

            except asyncio.CancelledError:
                logger.info("Stale connection check task cancelled")
                break
            except Exception as e:
                logger.error(f"Error in stale connection check: {e}")
                await asyncio.sleep(30)


# グローバルインスタンス（シングルトン）
manager = ConnectionManager()
