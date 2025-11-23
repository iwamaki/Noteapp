# @file main.py
# @summary アプリケーションのメインエントリポイント。FastAPIアプリを初期化し、ルーターを結合します。
# @responsibility FastAPIアプリケーションのインスタンス化、CORSミドルウェアの設定、および各ルーターのインクルードを行います。
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from src.api.websocket import manager
from src.auth import TokenType, router, validate_jwt_secret, verify_token
from src.billing import init_db
from src.billing.presentation.router import router as billing_router
from src.core.logger import logger
from src.llm_clean.infrastructure import (
    CollectionManager,
    start_cleanup_job,
    stop_cleanup_job,
)

# Clean Architecture imports
from src.llm_clean.presentation.routers import (
    chat_router_clean,
    knowledge_base_router_clean,
    provider_router_clean,
    tools_router_clean,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフスパン管理

    起動時とシャットダウン時に実行される処理を定義します。
    """
    # 起動時の処理
    logger.info("Application startup...")

    # JWT_SECRET_KEYのバリデーション（セキュリティチェック）
    try:
        validate_jwt_secret()
    except ValueError as e:
        logger.error(f"JWT secret key validation failed: {e}")
        raise RuntimeError(
            "Application startup aborted due to invalid JWT_SECRET_KEY. "
            "Please set a strong JWT_SECRET_KEY environment variable (minimum 32 characters)."
        ) from e

    # Billingデータベースを初期化（DATABASE_URLが設定されている場合のみ）
    try:
        init_db()
        logger.info("Billing database initialized")
    except Exception as e:
        logger.warning(
            f"Billing database initialization skipped: {e}",
            extra={"event_type": "startup", "component": "database"}
        )

    # コレクションマネージャーを初期化
    try:
        collection_manager = CollectionManager()

        # クリーンアップジョブを開始（10分間隔）
        await start_cleanup_job(collection_manager, interval_minutes=10)
        logger.info("Cleanup job started")
    except Exception as e:
        logger.warning(
            f"Cleanup job initialization skipped: {e}",
            extra={"event_type": "startup", "component": "cleanup_job"}
        )

    yield

    # シャットダウン時の処理
    logger.info("Application shutdown...")
    try:
        await stop_cleanup_job()
        logger.info("Cleanup job stopped")
    except Exception as e:
        logger.warning(f"Cleanup job stop skipped: {e}")


app = FastAPI(title="LLM File App API", lifespan=lifespan)

# レート制限の設定
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


# レート制限エラーハンドラー
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """レート制限超過時のカスタムエラーハンドラー"""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Too many requests. Please try again later.",
        },
    )


# CORS設定
# 環境変数から許可オリジンを取得
allowed_origins_str = os.getenv("ALLOWED_ORIGINS", "")
if allowed_origins_str:
    allowed_origins = [origin.strip() for origin in allowed_origins_str.split(",")]
else:
    # デフォルトは開発環境用
    allowed_origins = [
        "http://localhost:8081",
        "http://localhost:19006",
        "http://127.0.0.1:8081",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # 環境変数から取得
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Device-ID"],
)


# セキュリティヘッダーミドルウェア
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """セキュリティヘッダーを追加するミドルウェア

    OWASP推奨のセキュリティヘッダーを全レスポンスに追加します。
    """
    response = await call_next(request)

    # HSTS (HTTPS強制) - 本番環境でHTTPSが有効な場合のみ
    if os.getenv("ENVIRONMENT") == "production":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # Clickjacking防止
    response.headers["X-Frame-Options"] = "DENY"

    # MIME-Sniffing防止
    response.headers["X-Content-Type-Options"] = "nosniff"

    # XSS保護（古いブラウザ向け）
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Referrer制御
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Permissions Policy（不要な機能の無効化）
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"

    # Content Security Policy
    # API サーバーなので、主にdefault-srcとconnect-srcを制限
    api_domain = os.getenv("API_DOMAIN", "api.noteapp.iwamaki.app")
    response.headers["Content-Security-Policy"] = (
        "default-src 'none'; "
        "script-src 'none'; "
        "style-src 'none'; "
        "img-src 'none'; "
        "font-src 'none'; "
        f"connect-src 'self' https://{api_domain}"
    )

    return response


# Origin検証ミドルウェア（CSRF追加保護）
@app.middleware("http")
async def validate_origin(request: Request, call_next):
    """Originヘッダーを検証してCSRF攻撃を防ぐミドルウェア

    状態変更を伴うリクエスト（POST、PUT、DELETE）のOriginを検証します。
    JWTベースの認証を使用しているため、これで十分なCSRF保護を提供します。
    """
    # 状態変更を伴うメソッドのみ検証
    if request.method in ["POST", "PUT", "DELETE"]:
        origin = request.headers.get("origin")
        referer = request.headers.get("referer")

        # Origin または Referer のいずれかが存在する場合のみ検証
        # （モバイルアプリからのリクエストはOrigin/Refererがない場合があるため）
        if origin or referer:
            # Originを優先、なければRefererから抽出
            source = origin if origin else (referer.split("/")[0:3] if referer else [])
            source_url = source if isinstance(source, str) else "://".join(source)

            # 許可されたオリジンと照合
            if source_url not in allowed_origins and not any(
                source_url.startswith(allowed) for allowed in allowed_origins
            ):
                logger.warning(
                    "Invalid origin detected - possible CSRF attack",
                    extra={
                        "event_type": "security",
                        "event": "invalid_origin",
                        "origin": origin,
                        "referer": referer,
                        "method": request.method,
                        "path": request.url.path,
                        "ip": request.client.host if request.client else "unknown",
                    },
                )
                return JSONResponse(status_code=403, content={"detail": "Invalid origin"})

    return await call_next(request)


# ルーターのインクルード（Clean Architecture）
app.include_router(chat_router_clean)
app.include_router(provider_router_clean)
app.include_router(tools_router_clean)
app.include_router(knowledge_base_router_clean)
app.include_router(billing_router)
app.include_router(router)


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
            "auth": "/api/auth",
        },
    }


# Android App Links verification endpoint
@app.get("/.well-known/assetlinks.json")
async def assetlinks():
    """
    Android App Links検証用エンドポイント

    Androidがアプリとドメインの関連付けを検証するために使用します。
    開発環境でもこのエンドポイントが必要です（検証なしでもダイアログ経由で動作）。

    Returns:
        JSONレスポンス: Digital Asset Linksフォーマットのアプリ認証情報
    """
    package_name = os.getenv("ANDROID_PACKAGE_NAME", "com.iwash.NoteApp")

    return JSONResponse(
        content=[
            {
                "relation": ["delegate_permission/common.handle_all_urls"],
                "target": {
                    "namespace": "android_app",
                    "package_name": package_name,
                    "sha256_cert_fingerprints": [
                        "C9:EF:19:28:73:42:6E:06:FB:55:E4:8D:13:6F:B6:F7:CA:8A:C6:77:24:81:E2:EF:FA:36:83:92:67:DD:DF:E3"
                    ],
                },
            }
        ],
        media_type="application/json",
    )


# WebSocketエンドポイント
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocketエンドポイント（JWT認証付き）

    フロントエンドとの双方向通信を確立します。
    初回メッセージで認証トークンを受け取り、検証します。

    主な用途：
    - バックエンドからフロントエンドへのファイル内容リクエスト
    - フロントエンドからバックエンドへのファイル内容レスポンス

    Args:
        websocket: WebSocketインスタンス
    """
    await websocket.accept()
    user_id: str | None = None
    client_id: str | None = None

    try:
        # 初回メッセージで認証
        auth_message = await websocket.receive_json()

        if auth_message.get("type") != "auth":
            logger.warning("WebSocket: Authentication message expected")
            await websocket.close(code=1008, reason="Authentication required")
            return

        access_token = auth_message.get("access_token")
        if not access_token:
            logger.warning("WebSocket: Missing access token")
            await websocket.close(code=1008, reason="Access token required")
            return

        # トークン検証
        payload = verify_token(access_token, TokenType.ACCESS)
        if not payload:
            logger.warning("WebSocket: Invalid or expired token")
            await websocket.close(code=1008, reason="Invalid or expired token")
            return

        user_id = payload.get("sub")
        if not user_id:
            logger.warning("WebSocket: Missing user_id in token")
            await websocket.close(code=1008, reason="Invalid token payload")
            return

        # client_idを取得（フロントエンドから送られる、またはuser_idをフォールバック）
        client_id = auth_message.get("client_id", user_id)

        # 認証成功 - 接続を確立
        await manager.connect(websocket, client_id)
        logger.info(
            f"WebSocket authenticated and connected: user_id={user_id}, client_id={client_id}"
        )

        # 認証成功メッセージを送信
        await manager.send_message(
            client_id, {"type": "auth_success", "user_id": user_id, "client_id": client_id}
        )

        # メッセージ処理ループ
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

                logger.debug(
                    f"Received search_results_response: request_id={request_id}, results_count={len(results) if results else 0}"
                )

                # 保留中のリクエストを解決
                manager.resolve_request(request_id, results, error)

            elif data.get("type") == "ping":
                # ピングメッセージ（ハートビート用）
                manager.handle_ping(client_id)
                await manager.send_message(client_id, {"type": "pong"})

            elif data.get("type") == "auth":
                # 再認証メッセージ（トークンリフレッシュ後）
                access_token = data.get("access_token")
                if not access_token:
                    logger.warning(
                        f"Re-auth message missing access_token from client_id={client_id}"
                    )
                    continue

                # トークン検証
                payload = verify_token(access_token, TokenType.ACCESS)
                if not payload:
                    logger.warning(
                        f"Re-auth failed: Invalid or expired token from client_id={client_id}"
                    )
                    await manager.send_message(
                        client_id, {"type": "auth_error", "message": "Invalid or expired token"}
                    )
                    continue

                # トークンのユーザーIDが既存の接続と一致するか確認
                token_user_id = payload.get("sub")
                if token_user_id != user_id:
                    logger.warning(
                        f"Re-auth failed: User ID mismatch (current={user_id}, token={token_user_id})"
                    )
                    await manager.send_message(
                        client_id, {"type": "auth_error", "message": "User ID mismatch"}
                    )
                    continue

                # 再認証成功
                logger.info(
                    f"Re-authentication successful: user_id={user_id}, client_id={client_id}"
                )
                await manager.send_message(
                    client_id, {"type": "auth_success", "user_id": user_id, "client_id": client_id}
                )

            else:
                logger.warning(f"Unknown message type: {data.get('type')}")

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: user_id={user_id}, client_id={client_id}")
        if client_id:
            manager.disconnect(client_id)
    except Exception as e:
        logger.error(
            f"WebSocket error: user_id={user_id if user_id else 'unknown'}, client_id={client_id if client_id else 'unknown'}, {e}"
        )
        if client_id:
            manager.disconnect(client_id)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
