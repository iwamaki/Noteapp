"""
@file billing_schemas.py
@summary Billing API Pydanticスキーマ定義
@responsibility APIリクエスト/レスポンスのバリデーションとシリアライゼーション
"""


from pydantic import BaseModel, Field

# =====================================
# リクエストスキーマ
# =====================================

class AddCreditsRequest(BaseModel):
    """クレジット追加リクエスト（購入時）"""

    credits: int = Field(..., gt=0, description="追加するクレジット額（円）")
    purchase_record: dict = Field(
        ...,
        description="購入レコード情報",
        examples=[
            {
                "productId": "noteapp.credits.small",
                "transactionId": "1000000123456789",
                "purchaseToken": "abc...xyz",
                "purchaseDate": "2025-11-12T10:30:00Z",
                "amount": 300,
                "creditsAdded": 300,
            }
        ],
    )


class AllocationItem(BaseModel):
    """クレジット配分アイテム"""

    model_id: str = Field(
        ..., description="配分先モデルID", examples=["gemini-2.5-flash"]
    )
    credits: int = Field(..., gt=0, description="配分するクレジット額（円）")


class AllocateCreditsRequest(BaseModel):
    """クレジット配分リクエスト"""

    allocations: list[AllocationItem] = Field(
        ...,
        min_length=1,
        description="配分情報のリスト",
        examples=[
            [
                {"model_id": "gemini-2.5-flash", "credits": 100},
                {"model_id": "gemini-2.5-pro", "credits": 50},
            ]
        ],
    )


class ConsumeTokensRequest(BaseModel):
    """トークン消費リクエスト"""

    model_id: str = Field(
        ..., description="消費対象モデルID", examples=["gemini-2.5-flash"]
    )
    input_tokens: int = Field(..., ge=0, description="入力トークン数")
    output_tokens: int = Field(..., ge=0, description="出力トークン数")


# =====================================
# レスポンススキーマ
# =====================================


class TokenBalanceResponse(BaseModel):
    """トークン残高レスポンス"""

    credits: int = Field(..., description="未配分クレジット（円）")
    allocated_tokens: dict[str, int] = Field(
        ...,
        description="モデル別の配分済みトークン数",
        examples=[{"gemini-2.5-flash": 100000, "gemini-2.5-pro": 50000}],
    )


class CategoryBalanceResponse(BaseModel):
    """カテゴリー別残高レスポンス"""

    category: str = Field(..., description="カテゴリー名（quick/think）")
    total_tokens: int = Field(..., description="カテゴリー内の全トークン合計")


class ConsumeTokensResponse(BaseModel):
    """トークン消費レスポンス"""

    success: bool = Field(..., description="消費成功フラグ")
    remaining_tokens: int = Field(..., description="消費後の残トークン数")


class TransactionItem(BaseModel):
    """取引アイテム"""

    id: int = Field(..., description="取引ID")
    type: str = Field(..., description="取引タイプ（purchase/allocation/consumption）")
    amount: int = Field(..., description="取引額（クレジットまたはトークン数）")
    model_id: str | None = Field(None, description="対象モデルID")
    created_at: str = Field(..., description="取引日時（ISO 8601形式）")


class TransactionResponse(BaseModel):
    """取引履歴レスポンス"""

    transactions: list[TransactionItem] = Field(..., description="取引履歴のリスト")


class PricingInfoItem(BaseModel):
    """価格情報アイテム"""

    price_per_m_token: int = Field(..., description="販売価格（円/Mトークン）")
    category: str = Field(..., description="カテゴリー（quick/think）")


class PricingInfoResponse(BaseModel):
    """価格情報レスポンス（全モデル）"""

    pricing: dict[str, PricingInfoItem] = Field(
        ...,
        description="モデルID -> 価格情報のマッピング",
        examples=[
            {
                "gemini-2.5-flash": {"price_per_m_token": 255, "category": "quick"},
                "gemini-2.5-pro": {"price_per_m_token": 750, "category": "think"},
            }
        ],
    )


class OperationSuccessResponse(BaseModel):
    """汎用成功レスポンス"""

    success: bool = Field(True, description="操作成功フラグ")
    message: str | None = Field(None, description="メッセージ")
    new_balance: int | None = Field(None, description="新しい残高")
    remaining_tokens: int | None = Field(None, description="残トークン数")
