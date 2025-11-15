# @file schemas.py
# @summary 認証APIのPydanticスキーマ
# @responsibility リクエスト/レスポンスのバリデーションとシリアライゼーション

from pydantic import BaseModel, Field
from typing import Optional


class DeviceRegisterRequest(BaseModel):
    """デバイス登録リクエスト"""
    device_id: str = Field(..., min_length=1, description="デバイスの一意識別子（UUID）")


class DeviceRegisterResponse(BaseModel):
    """デバイス登録レスポンス"""
    user_id: str = Field(..., description="ユーザーID")
    is_new_user: bool = Field(..., description="新規ユーザーかどうか")
    message: str = Field(..., description="メッセージ")


class VerifyDeviceRequest(BaseModel):
    """デバイス検証リクエスト"""
    device_id: str = Field(..., min_length=1, description="デバイスの一意識別子（UUID）")
    user_id: str = Field(..., min_length=1, description="クライアント側で保持しているユーザーID")


class VerifyDeviceResponse(BaseModel):
    """デバイス検証レスポンス"""
    valid: bool = Field(..., description="device_idとuser_idの対応が正しいか")
    user_id: str = Field(..., description="サーバー側の正しいユーザーID")
    message: str = Field(..., description="メッセージ")


class ErrorResponse(BaseModel):
    """エラーレスポンス"""
    error: str = Field(..., description="エラーメッセージ")
    detail: Optional[str] = Field(None, description="詳細情報")
