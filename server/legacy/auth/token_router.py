# @file token_router.py
# @summary トークン管理APIエンドポイント
# @responsibility トークンリフレッシュ、ログアウトのHTTPエンドポイント

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from src.billing import get_db
from src.auth.service import AuthService, AuthenticationError
from src.auth.schemas import (
    RefreshTokenRequest,
    RefreshTokenResponse,
    LogoutRequest,
    LogoutResponse,
)
from src.auth.jwt_utils import (
    create_access_token,
    create_refresh_token,
    TokenType,
    get_user_id_from_token,
    get_device_id_from_token,
)
from src.core.logger import logger

router = APIRouter(prefix="/api/auth", tags=["token"])

# レート制限の設定
limiter = Limiter(key_func=get_remote_address)


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
    "/logout",
    response_model=LogoutResponse,
    status_code=status.HTTP_200_OK,
    summary="ログアウト",
    description="アクセストークンとリフレッシュトークンを無効化してログアウトします。"
)
@limiter.limit("20/minute")
async def logout(
    request: Request,
    body: LogoutRequest,
    db: Session = Depends(get_db)
):
    """
    ログアウトエンドポイント

    アクセストークンとリフレッシュトークンをブラックリストに追加し、
    無効化します。トークンは有効期限まで再利用できなくなります。

    レート制限: 20リクエスト/分（IPアドレスベース）

    Returns:
        LogoutResponse: {
            "message": "Logged out successfully",
            "success": true
        }

    Raises:
        HTTPException(400): トークンの無効化に失敗した場合
        HTTPException(500): サーバーエラー
    """
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
        )
    except Exception as e:
        logger.error(f"Unexpected error in logout: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )
