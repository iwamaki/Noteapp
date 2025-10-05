# @file llm_providers.py
# @summary LLMプロバイダー情報とヘルスチェックのエンドポイントを定義します。
# @responsibility /api/llm-providersおよび/api/healthへのGETリクエストを処理します。
from fastapi import APIRouter
from src.models import LLMProvider
from src.config import settings

router = APIRouter()

@router.get("/api/llm-providers")
async def get_llm_providers():
    """利用可能なLLMプロバイダーを取得"""
    providers = {}
    
    if settings.openai_api_key:
        providers["openai"] = LLMProvider(
            name="OpenAI",
            defaultModel="gpt-4",
            models=["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo-preview"],
            status="available"
        )
    
    if settings.gemini_api_key:
        providers["gemini"] = LLMProvider(
            name="Google Gemini",
            defaultModel="gemini-2.5-flash",
            models=["gemini-2.5-flash", "gemini-2.5-pro"],
            status="available"
        )
    
    if not providers:
        providers["openai"] = LLMProvider(
            name="OpenAI",
            defaultModel="gpt-3.5-turbo",
            models=["gpt-3.5-turbo"],
            status="unavailable"
        )
    
    return providers

@router.get("/api/health")
async def health_check():
    """ヘルスチェック"""
    providers_status = {}
    
    if settings.openai_api_key:
        providers_status["openai"] = {
            "name": "OpenAI",
            "status": "available",
            "defaultModel": "gpt-3.5-turbo",
            "models": ["gpt-3.5-turbo", "gpt-4"]
        }
    
    if settings.gemini_api_key:
        providers_status["gemini"] = {
            "name": "Google Gemini",
            "status": "available",
            "defaultModel": "gemini-2.5-flash",
            "models": ["gemini-2.5-flash"]
        }
    
    return {
        "status": "ok" if providers_status else "error",
        "providers": providers_status
    }
