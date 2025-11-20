# @file oauth_router.py
# @summary Google OAuth APIエンドポイント
# @responsibility Google OAuth認証フローのHTTPエンドポイント

import os

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from src.auth.google_oauth_flow import (
    GoogleOAuthFlowError,
    exchange_code_for_tokens,
    generate_auth_url,
    get_user_info_from_access_token,
)
from src.auth.jwt_utils import (
    create_access_token,
    create_refresh_token,
)
from src.auth.schemas import (
    GoogleAuthStartRequest,
    GoogleAuthStartResponse,
)

from src.auth.oauth_state_manager import get_state_manager
from src.core.logger import logger

router = APIRouter(prefix="/api/auth", tags=["oauth"])

# レート制限の設定
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/google/auth-start",
    response_model=GoogleAuthStartResponse,
    status_code=status.HTTP_200_OK,
    summary="Google OAuth2 認証開始（Authorization Code Flow）",
    description="Google OAuth2 認証フローを開始し、認証 URL を返します。"
)
@limiter.limit("20/minute")
async def google_auth_start(
    request: Request,
    body: GoogleAuthStartRequest
):
    """
    Google OAuth2 認証開始エンドポイント（Authorization Code Flow）

    フロー:
    1. このエンドポイントで state を生成し、認証 URL を取得
    2. フロントエンドで WebBrowser を開いて認証
    3. Google が /google/callback にリダイレクト
    4. バックエンドがトークン交換し、Deep Link でアプリに返却

    レート制限: 20リクエスト/分
    """
    try:
        # OAuth state manager を取得
        state_manager = get_state_manager()

        # state を生成（device_id と紐付け）
        state = state_manager.generate_state(body.device_id)

        # Google 認証 URL を生成
        auth_url = generate_auth_url(state)

        logger.info(
            "Google OAuth started",
            extra={"device_id": body.device_id[:20] + "...", "state": state[:10] + "..."}
        )

        return GoogleAuthStartResponse(
            auth_url=auth_url,
            state=state
        )

    except GoogleOAuthFlowError as e:
        logger.error(f"Failed to start Google OAuth: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in Google OAuth start: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) from e


@router.get(
    "/google/callback",
    status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    summary="Google OAuth2 コールバック",
    description="Google からのリダイレクトを処理し、トークンを交換してアプリにリダイレクトします。"
)
async def google_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None
):
    """
    Google OAuth2 コールバックエンドポイント

    Google が認証後にこのエンドポイントにリダイレクトします。
    Authorization Code を受け取り、トークンに交換して、
    Deep Link でアプリにリダイレクトします。
    """
    import uuid
    from datetime import datetime

    from src.billing import Credit, DeviceAuth, User, get_db

    try:
        # Get base URL for App Links
        oauth_redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "")
        if not oauth_redirect_uri:
            logger.error("GOOGLE_OAUTH_REDIRECT_URI environment variable not configured")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="OAuth redirect URI not configured"
            )
        base_url = oauth_redirect_uri.replace("/api/auth/google/callback", "")

        # エラーチェック
        if error:
            logger.warning(f"Google OAuth error: {error}")
            error_url = f"{base_url}/auth/callback?error={error}"
            return RedirectResponse(error_url)

        if not code or not state:
            logger.warning("Missing code or state in callback")
            error_url = f"{base_url}/auth/callback?error=missing_parameters"
            return RedirectResponse(error_url)

        # state を検証して device_id を取得
        state_manager = get_state_manager()
        device_id = state_manager.verify_state(state)

        if not device_id:
            logger.warning(f"Invalid or expired state: {state[:10]}...")
            error_url = f"{base_url}/auth/callback?error=invalid_state"
            return RedirectResponse(error_url)

        # Authorization Code をトークンに交換
        tokens = exchange_code_for_tokens(code)
        access_token = tokens.get("access_token")
        id_token = tokens.get("id_token")

        if not access_token or not id_token:
            logger.error("Missing tokens in Google response")
            error_url = f"{base_url}/auth/callback?error=token_exchange_failed"
            return RedirectResponse(error_url)

        # Access Token からユーザー情報を取得
        user_info = get_user_info_from_access_token(access_token)
        google_id = user_info.get("id")
        email = user_info.get("email")
        display_name = user_info.get("name")
        profile_picture_url = user_info.get("picture")

        if not google_id or not email:
            logger.error("Missing user info in Google response")
            error_url = f"{base_url}/auth/callback?error=user_info_failed"
            return RedirectResponse(error_url)

        # DB セッションを取得（依存性注入なしで直接取得）
        db = next(get_db())

        try:
            # Google ID でユーザーを検索
            existing_user = db.query(User).filter_by(google_id=google_id).first()

            user_id: str
            is_new_user: bool

            if existing_user:
                # 既存ユーザー
                assert existing_user.user_id is not None
                user_id = existing_user.user_id
                is_new_user = False

                # ユーザー情報を更新
                existing_user.email = email
                existing_user.display_name = display_name
                existing_user.profile_picture_url = profile_picture_url
                db.commit()

                logger.info(f"Existing Google user logged in: user_id={user_id}")

            else:
                # 新規ユーザー
                user_id = f"user_{uuid.uuid4().hex[:10]}"
                is_new_user = True

                new_user = User(
                    user_id=user_id,
                    google_id=google_id,
                    email=email,
                    display_name=display_name,
                    profile_picture_url=profile_picture_url
                )
                db.add(new_user)

                # クレジットレコードを作成
                credit = Credit(user_id=user_id, credits=0)
                db.add(credit)

                db.commit()

                logger.info(f"New Google user created: user_id={user_id}")

            # デバイス認証レコードを作成または更新
            existing_device = db.query(DeviceAuth).filter_by(device_id=device_id).first()
            if existing_device:
                # 既存デバイスが別のユーザーに紐付けられている場合は警告
                if existing_device.user_id != user_id:
                    logger.warning(
                        "Device reassignment detected during OAuth login",
                        extra={
                            "device_id": device_id[:20] + "...",
                            "old_user_id": existing_device.user_id,
                            "new_user_id": user_id
                        }
                    )
                existing_device.user_id = user_id
                existing_device.last_login_at = datetime.now()
            else:
                device_auth = DeviceAuth(device_id=device_id, user_id=user_id)
                db.add(device_auth)

            db.commit()

            # JWT トークンを生成
            jwt_access_token = create_access_token(user_id, device_id)
            jwt_refresh_token = create_refresh_token(user_id, device_id)

            logger.info(f"Google OAuth successful: user_id={user_id}, device_id={device_id[:20]}...")

            # Deep Link でアプリにリダイレクト
            from urllib.parse import urlencode
            params = urlencode({
                "access_token": jwt_access_token,
                "refresh_token": jwt_refresh_token,
                "user_id": user_id,
                "is_new_user": str(is_new_user).lower(),
                "email": email,
                "display_name": display_name or "",
                "profile_picture_url": profile_picture_url or "",
            })

            # Construct App Links URL (Android Intent Filter will intercept this)
            app_links_url = f"{base_url}/auth/callback?{params}"

            logger.debug(f"Redirecting to App Links URL: {app_links_url[:100]}...")

            # Redirect to HTTPS URL (Chrome Custom Tabs allows this, Android intercepts)
            return RedirectResponse(url=app_links_url, status_code=307)

        finally:
            db.close()

    except GoogleOAuthFlowError as e:
        logger.error(f"Google OAuth flow error: {e}")
        # Get base URL for App Links
        oauth_redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "")
        if oauth_redirect_uri:
            base_url = oauth_redirect_uri.replace("/api/auth/google/callback", "")
            error_url = f"{base_url}/auth/callback?error=oauth_flow_error"
        else:
            # If no redirect URI configured, return generic error
            error_url = "/auth/callback?error=oauth_flow_error"
        html_content = _generate_error_html("認証エラー", "認証中にエラーが発生しました。", error_url)
        return HTMLResponse(content=html_content, status_code=200)
    except Exception as e:
        logger.error(f"Unexpected error in Google callback: {e}")
        # Get base URL for App Links
        oauth_redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "")
        if oauth_redirect_uri:
            base_url = oauth_redirect_uri.replace("/api/auth/google/callback", "")
            error_url = f"{base_url}/auth/callback?error=internal_error"
        else:
            # If no redirect URI configured, return generic error
            error_url = "/auth/callback?error=internal_error"
        html_content = _generate_error_html("エラー", "予期しないエラーが発生しました。", error_url)
        return HTMLResponse(content=html_content, status_code=200)


@router.get(
    "/callback",
    status_code=status.HTTP_200_OK,
    summary="App Links OAuth コールバック",
    description="Android App Links 用の OAuth コールバックエンドポイント"
)
async def app_links_callback(request: Request):
    """
    App Links 用の OAuth コールバックエンドポイント

    Android の Intent Filter がこの URL を検出してアプリに自動的に渡します。
    フォールバックとして、カスタム URI スキームにリダイレクトする HTML ページを返します。
    """
    from urllib.parse import urlencode

    # すべてのクエリパラメータを取得
    query_params = dict(request.query_params)

    # カスタム URI スキーム URL を生成
    params_str = urlencode(query_params)
    deep_link = f"noteapp://auth?{params_str}"

    logger.debug(f"App Links callback received: {len(query_params)} params")

    # HTML ページを返す（App Links が機能しない場合のフォールバック）
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>認証完了</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }}
            .container {{
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                text-align: center;
                max-width: 400px;
            }}
            h1 {{
                color: #333;
                margin-bottom: 1rem;
            }}
            p {{
                color: #666;
                margin-bottom: 2rem;
            }}
            .btn {{
                display: inline-block;
                background: #667eea;
                color: white;
                padding: 1rem 2rem;
                border-radius: 0.5rem;
                text-decoration: none;
                font-weight: bold;
                font-size: 1.1rem;
            }}
            .success-icon {{
                font-size: 3rem;
                color: #4caf50;
                margin-bottom: 1rem;
            }}
        </style>
        <script>
            // 自動リダイレクト（3秒後）
            setTimeout(function() {{
                window.location.href = "{deep_link}";
            }}, 3000);
        </script>
    </head>
    <body>
        <div class="container">
            <div class="success-icon">✓</div>
            <h1>認証成功</h1>
            <p>自動的にアプリに戻ります...<br>戻らない場合は下のボタンをタップしてください。</p>
            <a href="{deep_link}" class="btn">アプリに戻る</a>
        </div>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content, status_code=200)


def _generate_error_html(title: str, message: str, error_url: str) -> str:
    """エラー用のHTMLを生成するヘルパー関数"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{title}</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            }}
            .container {{
                text-align: center;
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                max-width: 400px;
                margin: 1rem;
            }}
            h1 {{
                color: #333;
                margin-bottom: 1rem;
            }}
            p {{
                color: #666;
                margin-bottom: 2rem;
            }}
            .btn {{
                display: inline-block;
                background: #f5576c;
                color: white;
                padding: 1rem 2rem;
                border-radius: 0.5rem;
                text-decoration: none;
                font-weight: bold;
                font-size: 1.1rem;
            }}
            .error-icon {{
                font-size: 3rem;
                color: #f5576c;
                margin-bottom: 1rem;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error-icon">✗</div>
            <h1>{title}</h1>
            <p>{message}<br>アプリに戻って再試行してください。</p>
            <a href="{error_url}" class="btn">アプリに戻る</a>
        </div>
    </body>
    </html>
    """
