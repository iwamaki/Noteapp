# @file router.py
# @summary 認証APIエンドポイント
# @responsibility デバイスID認証のHTTPエンドポイント

import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from src.billing.database import get_db
from src.auth.service import AuthService, AuthenticationError, DeviceNotFoundError
from src.auth.schemas import (
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    VerifyDeviceRequest,
    VerifyDeviceResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    GoogleAuthStartRequest,
    GoogleAuthStartResponse,
)
from src.auth.google_oauth_flow import (
    generate_auth_url,
    exchange_code_for_tokens,
    get_user_info_from_access_token,
    GoogleOAuthFlowError,
)
from src.auth.oauth_state_manager import get_state_manager
from src.auth.jwt_utils import (
    create_access_token,
    create_refresh_token,
    TokenType,
    get_user_id_from_token,
    get_device_id_from_token,
)
from src.core.logger import logger

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# レート制限の設定
limiter = Limiter(key_func=get_remote_address)


@router.post(
    "/register",
    response_model=DeviceRegisterResponse,
    status_code=status.HTTP_200_OK,
    summary="デバイスID登録",
    description="デバイスIDを登録し、ユーザーアカウントを作成または取得します。"
)
@limiter.limit("10/minute")
async def register_device(
    request: Request,
    body: DeviceRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    デバイスID登録エンドポイント

    新規デバイスの場合は新しいユーザーアカウントを作成し、
    既存デバイスの場合は既存のユーザーIDを返します。

    レート制限: 10リクエスト/分（IPアドレスベース）
    """
    try:
        auth_service = AuthService(db)
        user_id, is_new_user = auth_service.register_device(body.device_id)

        message = "New account created" if is_new_user else "Welcome back"

        # JWTトークンを生成
        access_token = create_access_token(user_id, body.device_id)
        refresh_token = create_refresh_token(user_id, body.device_id)

        logger.info(
            "Tokens issued for user",
            extra={
                "user_id": user_id,
                "is_new_user": is_new_user,
                "device_id": body.device_id[:20] + "..."
            }
        )

        return DeviceRegisterResponse(
            user_id=user_id,
            is_new_user=is_new_user,
            message=message,
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )

    except AuthenticationError as e:
        logger.error(f"Device registration failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in device registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post(
    "/verify",
    response_model=VerifyDeviceResponse,
    status_code=status.HTTP_200_OK,
    summary="デバイスID・ユーザーID検証",
    description="クライアント側で保持しているuser_idとサーバー側のdevice_idに紐付くuser_idの整合性を検証します。"
)
@limiter.limit("20/minute")
async def verify_device(
    request: Request,
    body: VerifyDeviceRequest,
    db: Session = Depends(get_db)
):
    """
    デバイスID・ユーザーID検証エンドポイント

    クライアント側のuser_idとサーバー側のdevice_idに紐付くuser_idが
    一致しているかを確認し、不一致の場合は正しいuser_idを返します。

    レート制限: 20リクエスト/分（IPアドレスベース）

    Returns:
        VerifyDeviceResponse: {
            "valid": bool,
            "user_id": str,  # サーバー側の正しいuser_id
            "message": str
        }

    Raises:
        HTTPException(404): デバイスが未登録の場合
        HTTPException(500): サーバーエラー
    """
    try:
        auth_service = AuthService(db)
        valid, correct_user_id, message = auth_service.verify_device_user(
            body.device_id,
            body.user_id
        )

        return VerifyDeviceResponse(
            valid=valid,
            user_id=correct_user_id,
            message=message
        )

    except DeviceNotFoundError as e:
        logger.warning(f"Device verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error in device verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="トークンリフレッシュ",
    description="リフレッシュトークンを使用して新しいアクセストークンを取得します。"
)
@limiter.limit("20/minute")
async def refresh_token(
    request: Request,
    body: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    トークンリフレッシュエンドポイント

    リフレッシュトークンを検証し、新しいアクセストークンと
    リフレッシュトークンを発行します。

    レート制限: 20リクエスト/分（IPアドレスベース）

    Returns:
        RefreshTokenResponse: {
            "access_token": 新しいアクセストークン,
            "refresh_token": 新しいリフレッシュトークン,
            "token_type": "bearer"
        }

    Raises:
        HTTPException(401): トークンが無効または期限切れの場合
    """
    try:
        # リフレッシュトークンを検証
        user_id = get_user_id_from_token(body.refresh_token, TokenType.REFRESH)
        device_id = get_device_id_from_token(body.refresh_token, TokenType.REFRESH)

        if not user_id or not device_id:
            logger.warning("Refresh token validation failed")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )

        # 新しいトークンを生成
        new_access_token = create_access_token(user_id, device_id)
        new_refresh_token = create_refresh_token(user_id, device_id)

        logger.info(
            "Tokens refreshed successfully",
            extra={"user_id": user_id, "device_id": device_id[:20] + "..."}
        )

        return RefreshTokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in token refresh: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


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
        )
    except Exception as e:
        logger.error(f"Unexpected error in Google OAuth start: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )


@router.get(
    "/google/callback",
    status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    summary="Google OAuth2 コールバック",
    description="Google からのリダイレクトを処理し、トークンを交換してアプリにリダイレクトします。"
)
async def google_callback(
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None
):
    """
    Google OAuth2 コールバックエンドポイント

    Google が認証後にこのエンドポイントにリダイレクトします。
    Authorization Code を受け取り、トークンに交換して、
    Deep Link でアプリにリダイレクトします。
    """
    from src.billing.models import User, DeviceAuth, Credit

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
        from src.billing.database import get_db
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
                import uuid
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
                existing_device.user_id = user_id
                from datetime import datetime
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
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>認証エラー</title>
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
                <h1>認証エラー</h1>
                <p>認証中にエラーが発生しました。<br>アプリに戻って再試行してください。</p>
                <a href="{error_url}" class="btn">アプリに戻る</a>
            </div>
        </body>
        </html>
        """
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
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>エラー</title>
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
                <h1>エラー</h1>
                <p>予期しないエラーが発生しました。<br>アプリに戻って再試行してください。</p>
                <a href="{error_url}" class="btn">アプリに戻る</a>
            </div>
        </body>
        </html>
        """
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


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="ヘルスチェック",
    description="認証サービスのヘルスチェック"
)
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {"status": "ok", "service": "authentication"}
