# @file llm_providers.py
# @summary LLMプロバイダー情報とヘルスチェックのエンドポイントを定義します
# @responsibility /api/llm-providersおよび/api/healthへのGETリクエストを処理します。
from fastapi import APIRouter
from src.llm.models import LLMProvider, ModelMetadata, PricingInfo, CostInfo
from src.llm.routers.error_handlers import handle_route_errors
from src.core.config import settings

router = APIRouter()

@router.get("/api/llm-providers")
@handle_route_errors
async def get_llm_providers():
    """利用可能なLLMプロバイダーを取得（価格情報含む）"""
    providers = {}

    # モデルメタデータを変換（config形式 → ModelMetadata形式）
    model_metadata = {}
    for model_id, metadata in settings.model_metadata.items():
        # 価格情報を変換
        pricing = None
        if "pricing" in metadata:
            pricing_data = metadata["pricing"]
            pricing = PricingInfo(
                cost=CostInfo(
                    inputPricePer1M=pricing_data["cost"]["inputPricePer1M"],
                    outputPricePer1M=pricing_data["cost"]["outputPricePer1M"]
                ),
                sellingPriceJPY=pricing_data["sellingPriceJPY"]
            )

        model_metadata[model_id] = ModelMetadata(
            category=metadata["category"],
            displayName=metadata.get("displayName"),
            description=metadata.get("description"),
            recommended=metadata.get("recommended", False),
            pricing=pricing
        )

    # Geminiプロバイダー
    gemini_models = settings.available_models.get("gemini", [])
    gemini_metadata = {k: v for k, v in model_metadata.items() if k in gemini_models}

    if settings.gemini_api_key:
        providers["gemini"] = LLMProvider(
            name=settings.provider_display_names.get("gemini", "Google Gemini"),
            defaultModel=settings.get_default_model("gemini"),
            models=gemini_models,
            status="available",
            modelMetadata=gemini_metadata
        )
    else:
        # APIキーが設定されていない場合
        providers["gemini"] = LLMProvider(
            name=settings.provider_display_names.get("gemini", "Google Gemini"),
            defaultModel=settings.get_default_model("gemini"),
            models=gemini_models,
            status="unavailable",
            modelMetadata=gemini_metadata
        )

    # OpenAIプロバイダー
    openai_models = settings.available_models.get("openai", [])
    openai_metadata = {k: v for k, v in model_metadata.items() if k in openai_models}

    if settings.openai_api_key:
        providers["openai"] = LLMProvider(
            name=settings.provider_display_names.get("openai", "OpenAI"),
            defaultModel=settings.get_default_model("openai"),
            models=openai_models,
            status="available",
            modelMetadata=openai_metadata
        )
    else:
        # APIキーが設定されていない場合
        providers["openai"] = LLMProvider(
            name=settings.provider_display_names.get("openai", "OpenAI"),
            defaultModel=settings.get_default_model("openai"),
            models=openai_models,
            status="unavailable",
            modelMetadata=openai_metadata
        )

    return providers

@router.get("/api/health")
@handle_route_errors
async def health_check():
    """ヘルスチェック"""
    providers_status = {}

    if settings.gemini_api_key:
        providers_status["gemini"] = {
            "name": settings.provider_display_names.get("gemini", "Google Gemini"),
            "status": "available",
            "defaultModel": settings.get_default_model("gemini"),
            "models": settings.available_models.get("gemini", [])
        }

    if settings.openai_api_key:
        providers_status["openai"] = {
            "name": settings.provider_display_names.get("openai", "OpenAI"),
            "status": "available",
            "defaultModel": settings.get_default_model("openai"),
            "models": settings.available_models.get("openai", [])
        }

    return {
        "status": "ok" if providers_status else "error",
        "providers": providers_status
    }
