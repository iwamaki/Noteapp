# @file router.py
# @summary 認証APIエンドポイント
# @responsibility デバイスID認証のHTTPエンドポイント

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.billing.database import get_db
from src.auth.service import AuthService, AuthenticationError, DeviceNotFoundError
from src.auth.schemas import (
    DeviceRegisterRequest,
    DeviceRegisterResponse,
    VerifyDeviceRequest,
    VerifyDeviceResponse,
)
from src.core.logger import logger

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post(
    "/register",
    response_model=DeviceRegisterResponse,
    status_code=status.HTTP_200_OK,
    summary="デバイスID登録",
    description="デバイスIDを登録し、ユーザーアカウントを作成または取得します。"
)
async def register_device(
    request: DeviceRegisterRequest,
    db: Session = Depends(get_db)
):
    """
    デバイスID登録エンドポイント

    新規デバイスの場合は新しいユーザーアカウントを作成し、
    既存デバイスの場合は既存のユーザーIDを返します。
    """
    try:
        auth_service = AuthService(db)
        user_id, is_new_user = auth_service.register_device(request.device_id)

        message = "New account created" if is_new_user else "Welcome back"

        return DeviceRegisterResponse(
            user_id=user_id,
            is_new_user=is_new_user,
            message=message
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
async def verify_device(
    request: VerifyDeviceRequest,
    db: Session = Depends(get_db)
):
    """
    デバイスID・ユーザーID検証エンドポイント

    クライアント側のuser_idとサーバー側のdevice_idに紐付くuser_idが
    一致しているかを確認し、不一致の場合は正しいuser_idを返します。

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
            request.device_id,
            request.user_id
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


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="ヘルスチェック",
    description="認証サービスのヘルスチェック"
)
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {"status": "ok", "service": "authentication"}
