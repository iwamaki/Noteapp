# @file response_schemas.py
# @summary API レスポンススキーマ定義
# @responsibility APIレスポンスのバリデーションとシリアライゼーション


from pydantic import BaseModel, Field


class TokenBalanceResponse(BaseModel):
    """トークン残高レスポンス"""
    credits: int = Field(..., description="未配分クレジット（円）")
    allocated_tokens: dict[str, int] = Field(
        ...,
        description="モデル別の配分済みトークン数",
        examples=[{"gemini-2.5-flash": 100000, "gemini-2.5-pro": 50000}]
    )


class ConsumeTokensResponse(BaseModel):
    """トークン消費レスポンス"""
    success: bool = Field(..., description="消費成功フラグ")
    remaining_tokens: int = Field(..., description="消費後の残トークン数")


class TransactionResponse(BaseModel):
    """取引履歴レスポンス"""
    id: int = Field(..., description="取引ID")
    type: str = Field(..., description="取引タイプ（purchase/allocation/consumption）")
    amount: int = Field(..., description="取引額（クレジットまたはトークン数）")
    model_id: str | None = Field(None, description="対象モデルID")
    created_at: str = Field(..., description="取引日時（ISO 8601形式）")


class PricingInfoItem(BaseModel):
    """価格情報アイテム"""
    price_per_m_token: int = Field(..., description="販売価格（円/Mトークン）")
    category: str = Field(..., description="カテゴリー（quick/think）")


class PricingInfoResponse(BaseModel):
    """価格情報レスポンス（全モデル）"""
    pricing: dict[str, PricingInfoItem] = Field(
        ...,
        description="モデルID -> 価格情報のマッピング",
        examples=[{
            "gemini-2.5-flash": {"price_per_m_token": 255, "category": "quick"},
            "gemini-2.5-pro": {"price_per_m_token": 750, "category": "think"}
        }]
    )


class CategoryBalanceResponse(BaseModel):
    """カテゴリー別残高レスポンス"""
    category: str = Field(..., description="カテゴリー名（quick/think）")
    total_tokens: int = Field(..., description="カテゴリー内の全トークン合計")


class OperationSuccessResponse(BaseModel):
    """汎用成功レスポンス"""
    success: bool = Field(True, description="操作成功フラグ")
    message: str | None = Field(None, description="メッセージ")
    new_balance: int | None = Field(None, description="新しい残高")
