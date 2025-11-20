# @file llm_providers.py
# @summary LLMプロバイダー情報とヘルスチェックのエンドポイントを定義します
# @responsibility /api/llm-providersおよび/api/healthへのGETリクエストを処理します。
from fastapi import APIRouter

from src.core.config import settings
from src.llm.models import CostInfo, LLMProvider, ModelMetadata, PricingInfo
from src.llm.providers.registry import _get_registry
from src.llm.routers.error_handlers import handle_route_errors

router = APIRouter()

@router.get("/api/llm-providers")
@handle_route_errors
async def get_llm_providers():
    """利用可能なLLMプロバイダーを取得（価格情報含む）"""
    # メタデータを初期化（遅延初期化、循環依存回避）
    settings._ensure_metadata_initialized()

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

    # すべてのプロバイダーをレジストリからループ処理
    for provider_name, provider_config in _get_registry().items():
        # API keyの存在を確認
        api_key_field = provider_config.get_api_key_field()
        api_key = getattr(settings, api_key_field, None)
        status = "available" if api_key else "unavailable"

        # このプロバイダーのモデルリストとメタデータをフィルタリング
        models = provider_config.get_model_ids()
        provider_metadata = {k: v for k, v in model_metadata.items() if k in models}

        # LLMProviderを生成
        providers[provider_name] = LLMProvider(
            name=provider_config.display_name,
            defaultModel=provider_config.default_model,
            models=models,
            status=status,
            modelMetadata=provider_metadata
        )

    return providers

@router.get("/api/health")
@handle_route_errors
async def health_check():
    """ヘルスチェック"""
    providers_status = {}

    # すべてのプロバイダーをレジストリからループ処理
    for provider_name, provider_config in _get_registry().items():
        # API keyの存在を確認
        api_key_field = provider_config.get_api_key_field()
        api_key = getattr(settings, api_key_field, None)

        # API keyが設定されているプロバイダーのみ返す
        if api_key:
            providers_status[provider_name] = {
                "name": provider_config.display_name,
                "status": "available",
                "defaultModel": provider_config.default_model,
                "models": provider_config.get_model_ids()
            }

    return {
        "status": "ok" if providers_status else "error",
        "providers": providers_status
    }
