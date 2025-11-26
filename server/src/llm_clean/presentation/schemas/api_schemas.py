# @file schemas.py
# @summary APIリクエスト/レスポンスのPydanticモデル定義
# @responsibility 知識ベースAPIで使用する共通のスキーマを提供


from pydantic import BaseModel, EmailStr, Field


class CreateCollectionRequest(BaseModel):
    """一時コレクション作成リクエスト"""
    name: str | None = None
    prefix: str = "temp"
    ttl_hours: float = 1.0
    description: str | None = None


class UploadTextRequest(BaseModel):
    """テキストアップロードリクエスト"""
    text: str


class ShareCollectionRequest(BaseModel):
    """コレクション共有リクエスト"""
    target_email: EmailStr = Field(
        ...,
        description="共有先ユーザーのメールアドレス"
    )
