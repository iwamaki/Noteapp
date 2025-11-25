# @file schemas.py
# @summary フィードバックAPIのスキーマ定義
# @responsibility リクエスト/レスポンスのバリデーション

from pydantic import BaseModel, Field


class FeedbackRequest(BaseModel):
    """フィードバック送信リクエスト"""
    category: str = Field(
        ...,
        description="フィードバックカテゴリ (bug, feature, improvement, other)"
    )
    content: str = Field(..., description="フィードバック内容", min_length=1)
    rating: int | None = Field(
        None,
        description="満足度 (1-5)",
        ge=1,
        le=5
    )
    app_version: str | None = Field(None, description="アプリバージョン")
    platform: str | None = Field(None, description="プラットフォーム (ios, android)")
    device_id: str | None = Field(None, description="デバイスID")


class FeedbackResponse(BaseModel):
    """フィードバック送信レスポンス"""
    success: bool
    feedback_id: int
