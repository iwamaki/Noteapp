"""
@file schemas.py
@summary Pydantic schemas for payment and subscription endpoints
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal


class VerifyReceiptRequest(BaseModel):
    """レシート検証リクエスト"""
    receipt: str = Field(..., description="Purchase receipt/token from Google Play or App Store")
    product_id: str = Field(..., description="Product ID (e.g., noteapp.pro.monthly)")
    platform: Literal["android", "ios"] = Field(..., description="Platform (android or ios)")
    package_name: Optional[str] = Field(None, description="Android package name")


class SubscriptionStatus(BaseModel):
    """サブスクリプション状態"""
    tier: Literal["free", "standard", "pro", "premium"] = Field(..., description="Subscription tier")
    status: Literal["active", "canceled", "expired", "trial", "none"] = Field(..., description="Subscription status")
    expires_at: Optional[str] = Field(None, description="Expiration date (ISO 8601)")
    auto_renew: bool = Field(False, description="Auto-renewal enabled")
    is_valid: bool = Field(..., description="Whether subscription is currently valid")


class VerifyReceiptResponse(BaseModel):
    """レシート検証レスポンス"""
    valid: bool = Field(..., description="Whether receipt is valid")
    subscription_status: Optional[SubscriptionStatus] = Field(None, description="Subscription status if valid")
    error: Optional[str] = Field(None, description="Error message if invalid")


class GetSubscriptionStatusRequest(BaseModel):
    """サブスクリプション状態取得リクエスト"""
    user_id: str = Field(..., description="User ID or client ID")


class GetSubscriptionStatusResponse(BaseModel):
    """サブスクリプション状態取得レスポンス"""
    subscription_status: SubscriptionStatus = Field(..., description="Current subscription status")
