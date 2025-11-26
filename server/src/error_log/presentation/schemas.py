# @file schemas.py
# @summary エラーログAPIのスキーマ定義
# @responsibility リクエスト/レスポンスのバリデーション

from pydantic import BaseModel, Field


class ErrorLogRequest(BaseModel):
    """エラーログ送信リクエスト"""
    level: str = Field(..., description="ログレベル (error, warn)")
    category: str = Field(..., description="ログカテゴリ")
    message: str = Field(..., description="エラーメッセージ")
    stack_trace: str | None = Field(None, description="スタックトレース")
    additional_data: str | None = Field(None, description="追加データ (JSON文字列)")
    app_version: str | None = Field(None, description="アプリバージョン")
    platform: str | None = Field(None, description="プラットフォーム (ios, android)")
    device_id: str | None = Field(None, description="デバイスID")


class ErrorLogResponse(BaseModel):
    """エラーログ送信レスポンス"""
    success: bool
    log_id: int


class ErrorLogBatchRequest(BaseModel):
    """エラーログ一括送信リクエスト"""
    logs: list[ErrorLogRequest]


class ErrorLogBatchResponse(BaseModel):
    """エラーログ一括送信レスポンス"""
    success: bool
    count: int
