# @file response_schemas.py
# @summary 認証APIレスポンススキーマ
# @responsibility レスポンスのシリアライゼーション

from datetime import datetime

from pydantic import BaseModel, Field


class DeviceRegisterResponse(BaseModel):
    """デバイス登録レスポンス"""
    user_id: str = Field(..., description="ユーザーID")
    is_new_user: bool = Field(..., description="新規ユーザーかどうか")
    message: str = Field(..., description="メッセージ")
    access_token: str = Field(..., description="アクセストークン（JWT）")
    refresh_token: str = Field(..., description="リフレッシュトークン（JWT）")
    token_type: str = Field(default="bearer", description="トークンタイプ")


class VerifyDeviceResponse(BaseModel):
    """デバイス検証レスポンス"""
    valid: bool = Field(..., description="device_idとuser_idの対応が正しいか")
    user_id: str = Field(..., description="サーバー側の正しいユーザーID")
    message: str = Field(..., description="メッセージ")


class RefreshTokenResponse(BaseModel):
    """リフレッシュトークンレスポンス"""
    access_token: str = Field(..., description="新しいアクセストークン（JWT）")
    refresh_token: str = Field(..., description="新しいリフレッシュトークン（JWT）")
    token_type: str = Field(default="bearer", description="トークンタイプ")


class ErrorResponse(BaseModel):
    """エラーレスポンス"""
    error: str = Field(..., description="エラーメッセージ")
    detail: str | None = Field(None, description="詳細情報")


class GoogleAuthStartResponse(BaseModel):
    """Google OAuth2 認証開始レスポンス"""
    auth_url: str = Field(..., description="Google 認証URL（WebBrowser で開く）")
    state: str = Field(..., description="OAuth2 state パラメータ（検証用）")


class LogoutResponse(BaseModel):
    """ログアウトレスポンス"""
    message: str = Field(..., description="ログアウト結果メッセージ")
    success: bool = Field(..., description="ログアウト成功フラグ")


class DeviceInfo(BaseModel):
    """デバイス情報"""
    device_id: str = Field(..., description="デバイスID")
    device_name: str | None = Field(None, description="デバイス名（例: iPhone 14 Pro）")
    device_type: str | None = Field(None, description="デバイスタイプ（ios, android）")
    is_active: bool = Field(..., description="アクティブフラグ")
    created_at: datetime = Field(..., description="作成日時")
    last_login_at: datetime = Field(..., description="最終ログイン日時")

    class Config:
        from_attributes = True


class DeviceListResponse(BaseModel):
    """デバイス一覧レスポンス"""
    devices: list[DeviceInfo] = Field(..., description="デバイス一覧")
    total_count: int = Field(..., description="デバイス総数")


class DeleteDeviceResponse(BaseModel):
    """デバイス削除レスポンス"""
    message: str = Field(..., description="削除結果メッセージ")
    success: bool = Field(..., description="削除成功フラグ")
