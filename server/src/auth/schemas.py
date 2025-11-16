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
    access_token: str = Field(..., description="アクセストークン（JWT）")
    refresh_token: str = Field(..., description="リフレッシュトークン（JWT）")
    token_type: str = Field(default="bearer", description="トークンタイプ")


class VerifyDeviceRequest(BaseModel):
    """デバイス検証リクエスト"""
    device_id: str = Field(..., min_length=1, description="デバイスの一意識別子（UUID）")
    user_id: str = Field(..., min_length=1, description="クライアント側で保持しているユーザーID")


class VerifyDeviceResponse(BaseModel):
    """デバイス検証レスポンス"""
    valid: bool = Field(..., description="device_idとuser_idの対応が正しいか")
    user_id: str = Field(..., description="サーバー側の正しいユーザーID")
    message: str = Field(..., description="メッセージ")


class RefreshTokenRequest(BaseModel):
    """リフレッシュトークンリクエスト"""
    refresh_token: str = Field(..., min_length=1, description="リフレッシュトークン")


class RefreshTokenResponse(BaseModel):
    """リフレッシュトークンレスポンス"""
    access_token: str = Field(..., description="新しいアクセストークン（JWT）")
    refresh_token: str = Field(..., description="新しいリフレッシュトークン（JWT）")
    token_type: str = Field(default="bearer", description="トークンタイプ")


class ErrorResponse(BaseModel):
    """エラーレスポンス"""
    error: str = Field(..., description="エラーメッセージ")
    detail: Optional[str] = Field(None, description="詳細情報")


class GoogleLoginRequest(BaseModel):
    """Google OAuth2 ログインリクエスト"""
    id_token: str = Field(..., min_length=1, description="Google ID Token")
    device_id: Optional[str] = Field(None, description="デバイスID（任意）")


class GoogleLoginResponse(BaseModel):
    """Google OAuth2 ログインレスポンス"""
    user_id: str = Field(..., description="ユーザーID")
    is_new_user: bool = Field(..., description="新規ユーザーかどうか")
    email: str = Field(..., description="Googleアカウントのメールアドレス")
    display_name: Optional[str] = Field(None, description="表示名")
    profile_picture_url: Optional[str] = Field(None, description="プロフィール画像URL")
    access_token: str = Field(..., description="アクセストークン（JWT）")
    refresh_token: str = Field(..., description="リフレッシュトークン（JWT）")
    token_type: str = Field(default="bearer", description="トークンタイプ")
