"""
@file router.py
@summary Payment and subscription API endpoints
"""
from fastapi import APIRouter, HTTPException
from src.payment.schemas import (
    VerifyReceiptRequest,
    VerifyReceiptResponse,
    GetSubscriptionStatusRequest,
    GetSubscriptionStatusResponse,
    SubscriptionStatus,
)
from src.payment.google_play import GooglePlayVerifier
from src.core.logger import logger

router = APIRouter(prefix="/api/payment", tags=["payment"])

# Google Play検証インスタンス（シングルトン）
google_play_verifier = GooglePlayVerifier()

# TODO: 将来的にはデータベースで管理
# 現在は簡易的にメモリ内辞書で管理（開発用）
subscription_cache: dict[str, SubscriptionStatus] = {}


@router.post("/verify-receipt", response_model=VerifyReceiptResponse)
async def verify_receipt(request: VerifyReceiptRequest):
    """
    レシート検証エンドポイント

    Google PlayまたはApp Storeのレシートを検証し、
    サブスクリプション状態を返します。

    Args:
        request: レシート検証リクエスト

    Returns:
        検証結果とサブスクリプション状態
    """
    logger.info(f"Receipt verification request: platform={request.platform}, product_id={request.product_id}")

    if request.platform == "android":
        # Google Play検証
        result = await google_play_verifier.verify_subscription(
            product_id=request.product_id,
            purchase_token=request.receipt,
            package_name=request.package_name
        )

        if not result.get("valid"):
            return VerifyReceiptResponse(
                valid=False,
                subscription_status=None,
                error=result.get("error", "Invalid receipt")
            )

        subscription_status = SubscriptionStatus(
            tier=result["tier"],
            status=result["status"],
            expires_at=result.get("expires_at"),
            auto_renew=result.get("auto_renew", False),
            is_valid=result.get("is_valid", False)
        )

        return VerifyReceiptResponse(
            valid=True,
            subscription_status=subscription_status,
            error=None
        )

    elif request.platform == "ios":
        # TODO: App Store検証実装
        raise HTTPException(
            status_code=501,
            detail="iOS receipt verification not implemented yet"
        )

    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported platform: {request.platform}"
        )


@router.post("/subscription-status", response_model=GetSubscriptionStatusResponse)
async def get_subscription_status(request: GetSubscriptionStatusRequest):
    """
    サブスクリプション状態取得エンドポイント

    ユーザーIDに紐づくサブスクリプション状態を返します。

    Args:
        request: サブスクリプション状態取得リクエスト

    Returns:
        現在のサブスクリプション状態
    """
    logger.info(f"Get subscription status: user_id={request.user_id}")

    # TODO: データベースから取得
    # 現在は簡易的にキャッシュから取得
    status = subscription_cache.get(request.user_id)

    if not status:
        # デフォルト（未登録）
        status = SubscriptionStatus(
            tier="free",
            status="none",
            expires_at=None,
            auto_renew=False,
            is_valid=False
        )

    return GetSubscriptionStatusResponse(subscription_status=status)


@router.post("/update-subscription")
async def update_subscription(
    user_id: str,
    subscription_status: SubscriptionStatus
):
    """
    サブスクリプション状態更新エンドポイント（内部用）

    レシート検証後にサブスクリプション状態を更新します。

    Args:
        user_id: ユーザーID
        subscription_status: サブスクリプション状態
    """
    logger.info(f"Update subscription: user_id={user_id}, status={subscription_status}")

    # TODO: データベースに保存
    subscription_cache[user_id] = subscription_status

    return {"success": True, "user_id": user_id}
