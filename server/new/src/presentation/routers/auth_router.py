"""
@file auth_router.py
@summary Auth API Router - Clean Architecture版
@responsibility FastAPIエンドポイント定義、Application層Commands/Queriesの呼び出し
"""

import os

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from src.application.auth.commands import (
    LoginWithGoogleCommand,
    LogoutCommand,
    RefreshTokenCommand,
    RegisterDeviceCommand,
)
from src.auth.dependencies import verify_token_auth
from src.auth.oauth_state_manager import get_state_manager
from src.core.logger import logger
from src.infrastructure.database.connection import get_db
from src.presentation.dependencies.auth_dependencies import (
    get_login_with_google_command,
    get_logout_command,
    get_refresh_token_command,
    get_register_device_command,
)
from src.presentation.schemas.auth_schemas import (
    DeleteDeviceResponse,
    DeviceInfo,
    DeviceListResponse,
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    GoogleAuthStartRequest,
    GoogleAuthStartResponse,
    LogoutRequest,
    LogoutResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    VerifyDeviceRequest,
    VerifyDeviceResponse,
)

# NOTE: Temporarily using /api/auth/v2 prefix to avoid conflicts with old auth router
# Once fully tested and migrated, this will replace the old /api/auth router
router = APIRouter(prefix="/api/auth/v2", tags=["auth-v2"])


# =====================================
# デバイス認証
# =====================================


@router.post("/register", response_model=DeviceRegisterResponse)
async def register_device(
    request: DeviceRegisterRequest,
    command: RegisterDeviceCommand = Depends(get_register_device_command),
):
    """デバイスID登録

    新規デバイスの場合は新しいユーザーアカウントを作成し、
    既存デバイスの場合は既存のユーザーIDを返します。

    Returns:
        DeviceRegisterResponse: {
            "user_id": str,
            "is_new_user": bool,
            "message": str,
            "access_token": str,
            "refresh_token": str,
            "token_type": "bearer"
        }

    Raises:
        HTTPException(400): デバイス登録失敗
        HTTPException(500): サーバーエラー
    """
    try:
        result = await command.execute(request.device_id)

        return DeviceRegisterResponse(
            user_id=result["user_id"],
            is_new_user=result["is_new_user"],
            message=result["message"],
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            token_type="bearer",
        )
    except ValueError as e:
        logger.warning(f"[auth_router] Validation error in register_device: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"[auth_router] Error in register_device: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"デバイス登録に失敗しました: {str(e)}",
        ) from e


@router.post("/verify", response_model=VerifyDeviceResponse)
async def verify_device(
    request: VerifyDeviceRequest,
    db: Session = Depends(get_db),
):
    """デバイスID・ユーザーID検証

    クライアント側のuser_idとサーバー側のdevice_idに紐付くuser_idが
    一致しているかを確認し、不一致の場合は正しいuser_idを返します。

    Returns:
        VerifyDeviceResponse: {
            "valid": bool,
            "user_id": str,
            "message": str
        }

    Raises:
        HTTPException(404): デバイスが未登録の場合
        HTTPException(500): サーバーエラー
    """
    # NOTE: この機能は既存のAuthServiceに依存しているため、
    # 一時的に旧実装を使用。将来的にCommandに移行。
    try:
        from src.auth.service import (
            AuthService,
            DeviceNotFoundError,
        )

        auth_service = AuthService(db)
        valid, correct_user_id, message = auth_service.verify_device_user(
            request.device_id, request.user_id
        )

        return VerifyDeviceResponse(
            valid=valid, user_id=correct_user_id, message=message
        )

    except DeviceNotFoundError as e:
        logger.warning(f"Device verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in device verification: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from e


# =====================================
# トークン管理
# =====================================


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    command: RefreshTokenCommand = Depends(get_refresh_token_command),
):
    """トークンリフレッシュ

    リフレッシュトークンを検証し、新しいアクセストークンと
    リフレッシュトークンを発行します。

    Returns:
        RefreshTokenResponse: {
            "access_token": str,
            "refresh_token": str,
            "token_type": "bearer"
        }

    Raises:
        HTTPException(401): トークンが無効または期限切れの場合
        HTTPException(500): サーバーエラー
    """
    try:
        result = await command.execute(request.refresh_token)

        if not result or not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        return RefreshTokenResponse(
            access_token=result["access_token"],
            refresh_token=result["refresh_token"],
            token_type="bearer",
        )
    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"[auth_router] Validation error in refresh_token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"[auth_router] Error in refresh_token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"トークンリフレッシュに失敗しました: {str(e)}",
        ) from e


@router.post("/logout", response_model=LogoutResponse)
async def logout(
    request: LogoutRequest,
    command: LogoutCommand = Depends(get_logout_command),
):
    """ログアウト

    アクセストークンとリフレッシュトークンをブラックリストに追加し、
    無効化します。トークンは有効期限まで再利用できなくなります。

    Returns:
        LogoutResponse: {
            "message": str,
            "success": bool
        }

    Raises:
        HTTPException(400): トークンの無効化に失敗した場合
        HTTPException(500): サーバーエラー
    """
    try:
        result = await command.execute(request.access_token, request.refresh_token)

        return LogoutResponse(
            message=result["message"],
            success=result["success"],
        )
    except ValueError as e:
        logger.warning(f"[auth_router] Validation error in logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"[auth_router] Error in logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ログアウトに失敗しました: {str(e)}",
        ) from e


# =====================================
# Google OAuth
# =====================================


@router.post("/google/auth-start", response_model=GoogleAuthStartResponse)
async def google_auth_start(request: GoogleAuthStartRequest):
    """Google OAuth2 認証開始（Authorization Code Flow)

    フロー:
    1. このエンドポイントで state を生成し、認証 URL を取得
    2. フロントエンドで WebBrowser を開いて認証
    3. Google が /google/callback にリダイレクト
    4. バックエンドがトークン交換し、Deep Link でアプリに返却

    Returns:
        GoogleAuthStartResponse: {
            "auth_url": str,
            "state": str
        }

    Raises:
        HTTPException(500): OAuth URL生成失敗
    """
    try:
        from src.auth.google_oauth_flow import GoogleOAuthFlowError, generate_auth_url

        # OAuth state manager を取得
        state_manager = get_state_manager()

        # state を生成（device_id と紐付け）
        state = state_manager.generate_state(request.device_id)

        # Google 認証 URL を生成
        auth_url = generate_auth_url(state)

        logger.info(
            "Google OAuth started",
            extra={
                "device_id": request.device_id[:20] + "...",
                "state": state[:10] + "...",
            },
        )

        return GoogleAuthStartResponse(auth_url=auth_url, state=state)

    except GoogleOAuthFlowError as e:
        logger.error(f"Failed to start Google OAuth: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in Google OAuth start: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from e


@router.get("/google/callback", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
async def google_callback(
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    command: LoginWithGoogleCommand = Depends(get_login_with_google_command),
):
    """Google OAuth2 コールバック (Thin Controller)

    Google が認証後にこのエンドポイントにリダイレクトします。
    Authorization Code を受け取り、トークンに交換して、
    Deep Link でアプリにリダイレクトします。

    FAT CONTROLLER PROBLEM 解決:
    このコントローラーは10行以内に抑え、すべてのビジネスロジックを
    LoginWithGoogleCommand に委譲しています。
    """
    # Base URL取得
    oauth_redirect_uri = os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "")
    if not oauth_redirect_uri:
        logger.error("GOOGLE_OAUTH_REDIRECT_URI environment variable not configured")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OAuth redirect URI not configured",
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

    # state検証してdevice_id取得
    state_manager = get_state_manager()
    device_id = state_manager.verify_state(state)

    if not device_id:
        logger.warning(f"Invalid or expired state: {state[:10]}...")
        error_url = f"{base_url}/auth/callback?error=invalid_state"
        return RedirectResponse(error_url)

    # ビジネスロジックをCommandに委譲（Thin Controller）
    try:
        result = await command.execute(code, device_id)

        # Deep Link構築
        from urllib.parse import urlencode

        params = urlencode(
            {
                "access_token": result["access_token"],
                "refresh_token": result["refresh_token"],
                "user_id": result["user_id"],
                "is_new_user": str(result["is_new_user"]).lower(),
                "email": result["email"],
                "display_name": result.get("display_name", ""),
                "profile_picture_url": result.get("profile_picture_url", ""),
                "state": state,  # CSRF protection: include state in callback
            }
        )

        app_links_url = f"{base_url}/auth/callback?{params}"

        logger.debug(f"Redirecting to App Links URL: {app_links_url[:100]}...")

        return RedirectResponse(url=app_links_url, status_code=307)

    except ValueError as e:
        logger.error(f"Google OAuth flow error: {e}")
        error_url = f"{base_url}/auth/callback?error=oauth_flow_error"
        return RedirectResponse(error_url)
    except Exception as e:
        logger.error(f"Unexpected error in Google callback: {e}")
        error_url = f"{base_url}/auth/callback?error=internal_error"
        return RedirectResponse(error_url)


# =====================================
# デバイス管理
# =====================================


@router.get("/devices", response_model=DeviceListResponse)
async def get_devices(
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db),
):
    """デバイス一覧取得

    認証済みユーザーの全デバイス（アクティブ・非アクティブ含む）を取得します。

    Returns:
        DeviceListResponse: {
            "devices": [DeviceInfo, ...],
            "total_count": int
        }

    Raises:
        HTTPException(401): 認証失敗
        HTTPException(500): サーバーエラー
    """
    # NOTE: この機能は既存のAuthServiceに依存しているため、
    # 一時的に旧実装を使用。将来的にQueryに移行。
    try:
        from datetime import datetime

        from src.auth.service import AuthenticationError, AuthService

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
                last_login_at=device.last_login_at or datetime.now(),
            )
            for device in devices
        ]

        logger.info(
            "Device list retrieved successfully",
            extra={"user_id": user_id, "device_count": len(device_list)},
        )

        return DeviceListResponse(devices=device_list, total_count=len(device_list))

    except AuthenticationError as e:
        logger.error(f"Failed to get device list: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in get devices: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from e


@router.delete("/devices/{device_id}", response_model=DeleteDeviceResponse)
async def delete_device(
    device_id: str,
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db),
):
    """デバイス削除

    指定したデバイスを論理削除します。
    デバイスは物理的には削除されず、is_active フラグが False に設定されます。

    Args:
        device_id: 削除するデバイスID（パスパラメータ）

    Returns:
        DeleteDeviceResponse: {
            "message": str,
            "success": bool
        }

    Raises:
        HTTPException(401): 認証失敗
        HTTPException(403): アクセス権限なし（別ユーザーのデバイス）
        HTTPException(404): デバイスが見つからない
        HTTPException(500): サーバーエラー
    """
    # NOTE: この機能は既存のAuthServiceに依存しているため、
    # 一時的に旧実装を使用。将来的にCommandに移行。
    try:
        from src.auth.service import (
            AuthenticationError,
            AuthService,
            DeviceAccessDeniedError,
            DeviceNotFoundError,
        )

        auth_service = AuthService(db)
        auth_service.delete_device(user_id, device_id)

        logger.info(
            "Device deleted successfully",
            extra={"user_id": user_id, "device_id": device_id[:20] + "..."},
        )

        return DeleteDeviceResponse(
            message=f"Device {device_id} deleted successfully", success=True
        )

    except DeviceNotFoundError as e:
        logger.warning(f"Device deletion failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        ) from e
    except DeviceAccessDeniedError as e:
        logger.warning(f"Device deletion denied: {e}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        ) from e
    except AuthenticationError as e:
        logger.error(f"Failed to delete device: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(f"Unexpected error in delete device: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from e


# =====================================
# ヘルスチェック
# =====================================


@router.get("/health")
async def health_check():
    """ヘルスチェック

    Auth APIが正常に動作しているか確認。

    Returns:
        dict: {"status": "ok", "service": "auth"}
    """
    return {"status": "ok", "service": "auth"}
