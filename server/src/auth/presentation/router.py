# @file router.py
# @summary 認証APIエンドポイント（統合ルーター）
# @responsibility 認証関連のHTTPエンドポイント

import os
import uuid
from datetime import datetime
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse, RedirectResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from src.auth.application import (
    AuthenticationError,
    AuthService,
    DeviceAccessDeniedError,
    DeviceNotFoundError,
    OAuthService,
    OAuthServiceError,
    TokenType,
    create_access_token,
    create_refresh_token,
    get_device_id_from_token,
    get_user_id_from_token,
)
from src.auth.domain import Credit, DeviceAuth, User
from src.auth.oauth_state_manager import get_state_manager
from src.auth.presentation.dependencies import verify_token_auth
from src.auth.presentation.schemas.request_schemas import (
    DeviceRegisterRequest,
    GoogleAuthStartRequest,
    LogoutRequest,
    RefreshTokenRequest,
    VerifyDeviceRequest,
)
from src.auth.presentation.schemas.response_schemas import (
    DeleteDeviceResponse,
    DeviceInfo,
    DeviceListResponse,
    DeviceRegisterResponse,
    GoogleAuthStartResponse,
    LogoutResponse,
    RefreshTokenResponse,
    VerifyDeviceResponse,
)
from src.billing.infrastructure import get_db
from src.core.logger import logger

# メインルーター
router = APIRouter(prefix="/api/auth", tags=["auth"])

# レート制限の設定
limiter = Limiter(key_func=get_remote_address)


# ===============================================
# デバイス認証エンドポイント
# ===============================================

@router.post(
    "/register",
    response_model=DeviceRegisterResponse,
    status_code=status.HTTP_200_OK,
    summary="デバイスID登録",
    description="デバイスIDを登録し、ユーザーアカウントを作成または取得します。",
    tags=["device"]
)
@limiter.limit("10/minute")
async def register_device(
    request: Request,
    body: DeviceRegisterRequest,
    db: Session = Depends(get_db)
):
    """デバイスID登録エンドポイント"""
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
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in device registration: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) from e


@router.post(
    "/verify",
    response_model=VerifyDeviceResponse,
    status_code=status.HTTP_200_OK,
    summary="デバイスID・ユーザーID検証",
    description="クライアント側で保持しているuser_idとサーバー側のdevice_idに紐付くuser_idの整合性を検証します。",
    tags=["device"]
)
@limiter.limit("20/minute")
async def verify_device(
    request: Request,
    body: VerifyDeviceRequest,
    db: Session = Depends(get_db)
):
    """デバイスID・ユーザーID検証エンドポイント"""
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
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in device verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) from e


@router.get(
    "/devices",
    response_model=DeviceListResponse,
    status_code=status.HTTP_200_OK,
    summary="デバイス一覧取得",
    description="認証済みユーザーの全デバイス一覧を取得します。",
    tags=["device"]
)
@limiter.limit("30/minute")
async def get_devices(
    request: Request,
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db)
):
    """デバイス一覧取得エンドポイント"""
    try:
        auth_service = AuthService(db)
        devices = auth_service.get_user_devices(user_id)

        # DeviceAuth モデルを DeviceInfo スキーマに変換
        device_list = [
            DeviceInfo(
                device_id=device.device_id or "",
                device_name=device.device_name,
                device_type=device.device_type,
                is_active=device.is_active if device.is_active is not None else True,
                created_at=device.created_at or datetime.now(),
                last_login_at=device.last_login_at or datetime.now()
            )
            for device in devices
        ]

        logger.info(
            "Device list retrieved successfully",
            extra={"user_id": user_id, "device_count": len(device_list)}
        )

        return DeviceListResponse(
            devices=device_list,
            total_count=len(device_list)
        )

    except AuthenticationError as e:
        logger.error(f"Failed to get device list: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in get devices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) from e


@router.delete(
    "/devices/{device_id}",
    response_model=DeleteDeviceResponse,
    status_code=status.HTTP_200_OK,
    summary="デバイス削除",
    description="指定したデバイスを削除（論理削除）します。",
    tags=["device"]
)
@limiter.limit("20/minute")
async def delete_device(
    request: Request,
    device_id: str,
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db)
):
    """デバイス削除エンドポイント"""
    try:
        auth_service = AuthService(db)
        auth_service.delete_device(user_id, device_id)

        logger.info(
            "Device deleted successfully",
            extra={"user_id": user_id, "device_id": device_id[:20] + "..."}
        )

        return DeleteDeviceResponse(
            message=f"Device {device_id} deleted successfully",
            success=True
        )

    except DeviceNotFoundError as e:
        logger.warning(f"Device deletion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        ) from e
    except DeviceAccessDeniedError as e:
        logger.warning(f"Device deletion denied: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        ) from e
    except AuthenticationError as e:
        logger.error(f"Failed to delete device: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in delete device: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) from e


# ===============================================
# トークン管理エンドポイント
# ===============================================

@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="トークンリフレッシュ",
    description="リフレッシュトークンを使用して新しいアクセストークンを取得します。",
    tags=["token"]
)
@limiter.limit("20/minute")
async def refresh_token(
    request: Request,
    body: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """トークンリフレッシュエンドポイント"""
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
        ) from e


@router.post(
    "/logout",
    response_model=LogoutResponse,
    status_code=status.HTTP_200_OK,
    summary="ログアウト",
    description="アクセストークンとリフレッシュトークンを無効化してログアウトします。",
    tags=["token"]
)
@limiter.limit("20/minute")
async def logout(
    request: Request,
    body: LogoutRequest,
    db: Session = Depends(get_db)
):
    """ログアウトエンドポイント"""
    try:
        auth_service = AuthService(db)
        auth_service.logout(body.access_token, body.refresh_token)

        logger.info("User logged out successfully")

        return LogoutResponse(
            message="Logged out successfully",
            success=True
        )

    except AuthenticationError as e:
        logger.error(f"Logout failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) from e


# ===============================================
# OAuth エンドポイント
# ===============================================

@router.post(
    "/google/auth-start",
    response_model=GoogleAuthStartResponse,
    status_code=status.HTTP_200_OK,
    summary="Google OAuth2 認証開始（Authorization Code Flow）",
    description="Google OAuth2 認証フローを開始し、認証 URL を返します。",
    tags=["oauth"]
)
@limiter.limit("20/minute")
async def google_auth_start(
    request: Request,
    body: GoogleAuthStartRequest
):
    """Google OAuth2 認証開始エンドポイント"""
    try:
        # OAuth state manager を取得
        state_manager = get_state_manager()

        # state を生成（device_id と紐付け）
        state = state_manager.generate_state(body.device_id)

        # OAuth サービスで認証 URL を生成
        oauth_service = OAuthService()
        auth_url = oauth_service.start_auth_flow(state)

        logger.info(
            "Google OAuth started",
            extra={"device_id": body.device_id[:20] + "...", "state": state[:10] + "..."}
        )

        return GoogleAuthStartResponse(
            auth_url=auth_url,
            state=state
        )

    except OAuthServiceError as e:
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
    description="Google からのリダイレクトを処理し、トークンを交換してアプリにリダイレクトします。",
    tags=["oauth"]
)
async def google_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None
):
    """Google OAuth2 コールバックエンドポイント"""
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
            error_url = f"{base_url}/api/auth/callback?error={error}"
            return RedirectResponse(error_url)

        if not code or not state:
            logger.warning("Missing code or state in callback")
            error_url = f"{base_url}/api/auth/callback?error=missing_parameters"
            return RedirectResponse(error_url)

        # state を検証して device_id を取得
        state_manager = get_state_manager()
        device_id = state_manager.verify_state(state)

        if not device_id:
            logger.warning(f"Invalid or expired state: {state[:10]}...")
            error_url = f"{base_url}/api/auth/callback?error=invalid_state"
            return RedirectResponse(error_url)

        # OAuth サービスでトークン交換とユーザー情報取得
        oauth_service = OAuthService()
        tokens = oauth_service.exchange_code(code)
        access_token = tokens.get("access_token")
        id_token = tokens.get("id_token")

        if not access_token or not id_token:
            logger.error("Missing tokens in Google response")
            error_url = f"{base_url}/api/auth/callback?error=token_exchange_failed"
            return RedirectResponse(error_url)

        # ユーザー情報を取得
        user_info = oauth_service.get_user_info(access_token)
        google_id = user_info.get("id")
        email = user_info.get("email")
        display_name = user_info.get("name")
        profile_picture_url = user_info.get("picture")

        if not google_id or not email:
            logger.error("Missing user info in Google response")
            error_url = f"{base_url}/auth/callback?error=user_info_failed"
            return RedirectResponse(error_url)

        # DB セッションを取得
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
            app_links_url = f"{base_url}/api/auth/callback?{params}"

            logger.debug(f"Redirecting to App Links URL: {app_links_url[:100]}...")

            # Redirect to HTTPS URL
            return RedirectResponse(url=app_links_url, status_code=307)

        finally:
            db.close()

    except OAuthServiceError as e:
        logger.error(f"Google OAuth flow error: {e}")
        oauth_redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "")
        if oauth_redirect_uri:
            base_url = oauth_redirect_uri.replace("/api/auth/google/callback", "")
            error_url = f"{base_url}/api/auth/callback?error=oauth_flow_error"
        else:
            error_url = "/api/auth/callback?error=oauth_flow_error"
        html_content = _generate_error_html("認証エラー", "認証中にエラーが発生しました。", error_url)
        return HTMLResponse(content=html_content, status_code=200)
    except Exception as e:
        logger.error(f"Unexpected error in Google callback: {e}")
        oauth_redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "")
        if oauth_redirect_uri:
            base_url = oauth_redirect_uri.replace("/api/auth/google/callback", "")
            error_url = f"{base_url}/api/auth/callback?error=internal_error"
        else:
            error_url = "/api/auth/callback?error=internal_error"
        html_content = _generate_error_html("エラー", "予期しないエラーが発生しました。", error_url)
        return HTMLResponse(content=html_content, status_code=200)


@router.get(
    "/callback",
    status_code=status.HTTP_200_OK,
    summary="App Links OAuth コールバック",
    description="Android App Links 用の OAuth コールバックエンドポイント",
    tags=["oauth"]
)
async def app_links_callback(request: Request):
    """App Links 用の OAuth コールバックエンドポイント"""
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


# ===============================================
# ヘルスチェック
# ===============================================

@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="ヘルスチェック",
    description="認証サービスのヘルスチェック",
    tags=["health"]
)
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {"status": "ok", "service": "authentication"}


# ===============================================
# ヘルパー関数
# ===============================================

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
