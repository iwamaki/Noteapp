# @file request_schemas.py
# @summary 認証APIリクエストスキーマ
# @responsibility リクエストのバリデーション

from pydantic import BaseModel, Field


class DeviceRegisterRequest(BaseModel):
    """デバイス登録リクエスト"""
    device_id: str = Field(..., min_length=1, description="デバイスの一意識別子（UUID）")


class VerifyDeviceRequest(BaseModel):
    """デバイス検証リクエスト"""
    device_id: str = Field(..., min_length=1, description="デバイスの一意識別子（UUID）")
    user_id: str = Field(..., min_length=1, description="クライアント側で保持しているユーザーID")


class RefreshTokenRequest(BaseModel):
    """リフレッシュトークンリクエスト"""
    refresh_token: str = Field(..., min_length=1, description="リフレッシュトークン")


class GoogleAuthStartRequest(BaseModel):
    """Google OAuth2 認証開始リクエスト（Authorization Code Flow）"""
    device_id: str = Field(..., min_length=1, description="デバイスID")


class LogoutRequest(BaseModel):
    """ログアウトリクエスト"""
    access_token: str = Field(..., min_length=1, description="無効化するアクセストークン")
    refresh_token: str = Field(..., min_length=1, description="無効化するリフレッシュトークン")
