# @file router.py
# @summary 認証APIエンドポイント（メインルーター）
# @responsibility 認証関連のサブルーターを統合し、ヘルスチェックを提供

from fastapi import APIRouter, status

# サブルーターをインポート
from src.auth.device_router import router as device_router
from src.auth.oauth_router import router as oauth_router
from src.auth.token_router import router as token_router

# メインルーター
router = APIRouter()

# サブルーターを含める（prefix は各サブルーターで設定済み）
router.include_router(device_router)
router.include_router(token_router)
router.include_router(oauth_router)


@router.get(
    "/api/auth/health",
    status_code=status.HTTP_200_OK,
    summary="ヘルスチェック",
    description="認証サービスのヘルスチェック",
    tags=["health"]
)
async def health_check():
    """ヘルスチェックエンドポイント"""
    return {"status": "ok", "service": "authentication"}
