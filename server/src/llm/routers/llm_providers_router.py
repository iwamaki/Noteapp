# @file llm_providers.py
# @summary LLMプロバイダー情報とヘルスチェックのエンドポイントを定義します（Gemini専用）
# @responsibility /api/llm-providersおよび/api/healthへのGETリクエストを処理します。
from fastapi import APIRouter
from src.llm.models import LLMProvider
from src.llm.routers.error_handlers import handle_route_errors
from src.core.config import settings

router = APIRouter()

@router.get("/api/llm-providers")
@handle_route_errors
async def get_llm_providers():
    """利用可能なLLMプロバイダーを取得（Gemini専用）"""
    providers = {}

    # Geminiプロバイダー
    if settings.gemini_api_key:
        providers["gemini"] = LLMProvider(
            name=settings.provider_display_names.get("gemini", "Google Gemini"),
            defaultModel=settings.get_default_model("gemini"),
            models=settings.available_models.get("gemini", []),
            status="available"
        )
    else:
        # APIキーが設定されていない場合
        providers["gemini"] = LLMProvider(
            name=settings.provider_display_names.get("gemini", "Google Gemini"),
            defaultModel=settings.get_default_model("gemini"),
            models=settings.available_models.get("gemini", []),
            status="unavailable"
        )

    return providers

@router.get("/api/health")
@handle_route_errors
async def health_check():
    """ヘルスチェック（Gemini専用）"""
    providers_status = {}

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
