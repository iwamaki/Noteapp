# @file router.py
# @summary 認証APIエンドポイント
# @responsibility デバイスID認証のHTTPエンドポイント

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from src.billing.database import get_db
from src.auth.service import AuthService, AuthenticationError
from src.auth.schemas import (
    DeviceRegisterRequest,
    DeviceRegisterResponse,
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


@router.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="ヘルスチェック",
    description="認証サービスのヘルスチェック"
)
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {"status": "ok", "service": "authentication"}
