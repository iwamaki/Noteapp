# @file device_router.py
# @summary デバイス認証・管理APIエンドポイント
# @responsibility デバイスID認証、デバイス管理のHTTPエンドポイント

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from src.auth.dependencies import verify_token_auth
from src.auth.jwt_utils import (
    create_access_token,
    create_refresh_token,
)
from src.auth.schemas import (
    DeleteDeviceResponse,
    DeviceInfo,
    DeviceListResponse,
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    VerifyDeviceRequest,
    VerifyDeviceResponse,
)
from src.auth.service import (
    AuthenticationError,
    AuthService,
    DeviceAccessDeniedError,
    DeviceNotFoundError,
)

from src.billing import get_db
from src.core.logger import logger

router = APIRouter(prefix="/api/auth", tags=["device"])

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
    description="認証済みユーザーの全デバイス一覧を取得します。"
)
@limiter.limit("30/minute")
async def get_devices(
    request: Request,
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db)
):
    """
    デバイス一覧取得エンドポイント

    認証済みユーザーの全デバイス（アクティブ・非アクティブ含む）を取得します。

    レート制限: 30リクエスト/分（IPアドレスベース）

    Returns:
        DeviceListResponse: {
            "devices": [DeviceInfo, ...],
            "total_count": int
        }

    Raises:
        HTTPException(401): 認証失敗
        HTTPException(500): サーバーエラー
    """
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
    description="指定したデバイスを削除（論理削除）します。"
)
@limiter.limit("20/minute")
async def delete_device(
    request: Request,
    device_id: str,
    user_id: str = Depends(verify_token_auth),
    db: Session = Depends(get_db)
):
    """
    デバイス削除エンドポイント

    指定したデバイスを論理削除します。
    デバイスは物理的には削除されず、is_active フラグが False に設定されます。

    レート制限: 20リクエスト/分（IPアドレスベース）

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
