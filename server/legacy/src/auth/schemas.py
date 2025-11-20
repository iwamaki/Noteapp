# @file schemas.py
# @summary 認証APIのPydanticスキーマ
# @responsibility リクエスト/レスポンスのバリデーションとシリアライゼーション

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


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


class GoogleAuthStartRequest(BaseModel):
    """Google OAuth2 認証開始リクエスト（Authorization Code Flow）"""
    device_id: str = Field(..., min_length=1, description="デバイスID")


class GoogleAuthStartResponse(BaseModel):
    """Google OAuth2 認証開始レスポンス"""
    auth_url: str = Field(..., description="Google 認証URL（WebBrowser で開く）")
    state: str = Field(..., description="OAuth2 state パラメータ（検証用）")


class LogoutRequest(BaseModel):
    """ログアウトリクエスト"""
    access_token: str = Field(..., min_length=1, description="無効化するアクセストークン")
    refresh_token: str = Field(..., min_length=1, description="無効化するリフレッシュトークン")


class LogoutResponse(BaseModel):
    """ログアウトレスポンス"""
    message: str = Field(..., description="ログアウト結果メッセージ")
    success: bool = Field(..., description="ログアウト成功フラグ")


class DeviceInfo(BaseModel):
    """デバイス情報"""
    device_id: str = Field(..., description="デバイスID")
    device_name: Optional[str] = Field(None, description="デバイス名（例: iPhone 14 Pro）")
    device_type: Optional[str] = Field(None, description="デバイスタイプ（ios, android）")
    is_active: bool = Field(..., description="アクティブフラグ")
    created_at: datetime = Field(..., description="作成日時")
    last_login_at: datetime = Field(..., description="最終ログイン日時")

    class Config:
        from_attributes = True


class DeviceListResponse(BaseModel):
    """デバイス一覧レスポンス"""
    devices: List[DeviceInfo] = Field(..., description="デバイス一覧")
    total_count: int = Field(..., description="デバイス総数")


class DeleteDeviceResponse(BaseModel):
    """デバイス削除レスポンス"""
    message: str = Field(..., description="削除結果メッセージ")
    success: bool = Field(..., description="削除成功フラグ")
