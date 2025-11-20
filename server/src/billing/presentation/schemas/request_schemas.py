# @file request_schemas.py
# @summary API リクエストスキーマ定義
# @responsibility APIリクエストのバリデーションとシリアライゼーション


from pydantic import BaseModel, Field


class AddCreditsRequest(BaseModel):
    """クレジット追加リクエスト（購入時）"""
    credits: int = Field(..., gt=0, description="追加するクレジット額（円）")
    purchase_record: dict = Field(
        ...,
        description="購入レコード情報",
        examples=[{
            "productId": "noteapp.credits.small",
            "transactionId": "1000000123456789",
            "purchaseDate": "2025-11-12T10:30:00Z",
            "amount": 300,
            "creditsAdded": 300
        }]
    )


class AllocationItem(BaseModel):
    """クレジット配分アイテム"""
    model_id: str = Field(..., description="配分先モデルID", examples=["gemini-2.5-flash"])
    credits: int = Field(..., gt=0, description="配分するクレジット額（円）")


class AllocateCreditsRequest(BaseModel):
    """クレジット配分リクエスト"""
    allocations: list[AllocationItem] = Field(
        ...,
        min_length=1,
        description="配分情報のリスト",
        examples=[[
            {"model_id": "gemini-2.5-flash", "credits": 100},
            {"model_id": "gemini-2.5-pro", "credits": 50}
        ]]
    )


class ConsumeTokensRequest(BaseModel):
    """トークン消費リクエスト"""
    model_id: str = Field(..., description="消費対象モデルID", examples=["gemini-2.5-flash"])
    input_tokens: int = Field(..., ge=0, description="入力トークン数")
    output_tokens: int = Field(..., ge=0, description="出力トークン数")
