"""
Presentation Layer - LLM Router Integration

LLM関連のすべてのルーターを統合します。

責務:
- 各サブルーターの統合
- ルーターのエクスポート
"""

from fastapi import APIRouter
from src.presentation.api.v1.llm.chat_router import router as chat_router
from src.presentation.api.v1.llm.provider_router import router as provider_router

# LLMルーターを統合
router = APIRouter()

# チャット関連のルーターを統合
router.include_router(chat_router, tags=["chat"])

# プロバイダー関連のルーターを統合
router.include_router(provider_router, tags=["providers"])

__all__ = ["router"]
