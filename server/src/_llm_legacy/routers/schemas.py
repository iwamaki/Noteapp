# @file schemas.py
# @summary APIリクエスト/レスポンスのPydanticモデル定義
# @responsibility 知識ベースAPIで使用する共通のスキーマを提供

from pydantic import BaseModel
from typing import Optional


class CreateCollectionRequest(BaseModel):
    """一時コレクション作成リクエスト"""
    name: Optional[str] = None
    prefix: str = "temp"
    ttl_hours: float = 1.0
    description: Optional[str] = None


class UploadTextRequest(BaseModel):
    """テキストアップロードリクエスト"""
    text: str
