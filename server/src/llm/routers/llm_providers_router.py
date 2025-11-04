# @file llm_providers.py
# @summary LLMプロバイダー情報とヘルスチェックのエンドポイントを定義します。
# @responsibility /api/llm-providersおよび/api/healthへのGETリクエストを処理します。
from fastapi import APIRouter
from src.llm.models import LLMProvider
from src.core.config import settings

router = APIRouter()

@router.get("/api/llm-providers")
async def get_llm_providers():
    """利用可能なLLMプロバイダーを取得"""
    providers = {}

    # OpenAIプロバイダー
    if settings.openai_api_key:
        providers["openai"] = LLMProvider(
            name=settings.provider_display_names.get("openai", "OpenAI"),
            defaultModel=settings.get_default_model("openai"),
            models=settings.available_models.get("openai", []),
            status="available"
        )

    # Geminiプロバイダー
    if settings.gemini_api_key:
        providers["gemini"] = LLMProvider(
            name=settings.provider_display_names.get("gemini", "Google Gemini"),
            defaultModel=settings.get_default_model("gemini"),
            models=settings.available_models.get("gemini", []),
            status="available"
        )

    # APIキーが設定されていない場合のフォールバック
    if not providers:
        default_provider = settings.get_default_provider()
        providers[default_provider] = LLMProvider(
            name=settings.provider_display_names.get(default_provider, default_provider.capitalize()),
            defaultModel=settings.get_default_model(default_provider),
            models=settings.available_models.get(default_provider, []),
            status="unavailable"
        )

    return providers

@router.get("/api/health")
async def health_check():
    """ヘルスチェック"""
    providers_status = {}

    if settings.openai_api_key:
        providers_status["openai"] = {
            "name": settings.provider_display_names.get("openai", "OpenAI"),
            "status": "available",
            "defaultModel": settings.get_default_model("openai"),
            "models": settings.available_models.get("openai", [])
        }

    if settings.gemini_api_key:
        providers_status["gemini"] = {
            "name": settings.provider_display_names.get("gemini", "Google Gemini"),
            "status": "available",
            "defaultModel": settings.get_default_model("gemini"),
            "models": settings.available_models.get("gemini", [])
        }

    return {
        "status": "ok" if providers_status else "error",
        "providers": providers_status
    }
