"""
Presentation Layer - Provider Router

LLMプロバイダー情報とヘルスチェックのAPIエンドポイントを定義します。

責務:
- プロバイダー一覧の提供
- ヘルスチェック
- Application層のQueriesへの処理委譲
"""

from fastapi import APIRouter

from src.application.llm.queries import GetProvidersQuery
from src.infrastructure.config.settings import get_settings
from src.infrastructure.logging.logger import get_logger
from src.presentation.api.v1.llm.schemas import CostInfo, LLMProvider, ModelMetadata, PricingInfo
from src.shared.utils.error_handlers import handle_route_errors

settings = get_settings()
logger = get_logger("provider_router")

router = APIRouter()


@router.get("/api/llm-providers")
@handle_route_errors
async def get_llm_providers():
    """利用可能なLLMプロバイダーを取得（価格情報含む）

    Returns:
        Dict[str, LLMProvider]: プロバイダー名をキーとした辞書
            - key: プロバイダー名（"gemini", "openai"等）
            - value: LLMProvider
                - name: 表示名
                - defaultModel: デフォルトモデルID
                - models: 利用可能なモデルIDリスト
                - status: "available"または"unavailable"
                - modelMetadata: モデルメタデータの辞書（価格情報含む）
    """
    logger.info("GET /api/llm-providers")

    # メタデータを初期化（遅延初期化、循環依存回避）
    settings._ensure_metadata_initialized()

    # Queryを実行してプロバイダー情報を取得
    query = GetProvidersQuery()
    providers_dto = await query.execute()

    # DTO → Pydantic変換（価格情報を追加）
    providers = {}
    for provider_name, provider_dto in providers_dto.items():
        # モデルメタデータを変換（価格情報を追加）
        model_metadata = {}
        if provider_dto.model_metadata:
            for model_id, metadata_dto in provider_dto.model_metadata.items():
                # settingsから価格情報を取得
                pricing = None
                if model_id in settings.model_metadata:
                    metadata_config = settings.model_metadata[model_id]
                    if "pricing" in metadata_config:
                        pricing_data = metadata_config["pricing"]
                        pricing = PricingInfo(
                            cost=CostInfo(
                                inputPricePer1M=pricing_data["cost"]["inputPricePer1M"],
                                outputPricePer1M=pricing_data["cost"]["outputPricePer1M"]
                            ),
                            sellingPriceJPY=pricing_data["sellingPriceJPY"]
                        )

                model_metadata[model_id] = ModelMetadata(
                    category=metadata_dto.category,
                    displayName=metadata_dto.display_name,
                    description=metadata_dto.description,
                    recommended=metadata_dto.recommended,
                    pricing=pricing
                )

        # LLMProviderを生成
        providers[provider_name] = LLMProvider(
            name=provider_dto.name,
            defaultModel=provider_dto.default_model,
            models=provider_dto.models,
            status=provider_dto.status,
            modelMetadata=model_metadata if model_metadata else None
        )

    logger.info(
        f"Returning {len(providers)} providers, "
        f"available={sum(1 for p in providers.values() if p.status == 'available')}"
    )

    return providers


@router.get("/api/health")
@handle_route_errors
async def health_check():
    """ヘルスチェック

    Returns:
        Dict: ヘルスチェック情報
            - status: "ok"または"error"
            - providers: 利用可能なプロバイダーの辞書
    """
    logger.info("GET /api/health")

    # Queryを実行してプロバイダー情報を取得
    query = GetProvidersQuery()
    providers_dto = await query.execute()

    # API keyが設定されているプロバイダーのみ返す
    providers_status = {}
    for provider_name, provider_dto in providers_dto.items():
        if provider_dto.status == "available":
            providers_status[provider_name] = {
                "name": provider_dto.name,
                "status": "available",
                "defaultModel": provider_dto.default_model,
                "models": provider_dto.models
            }

    status = "ok" if providers_status else "error"

    logger.info(f"Health check: status={status}, available_providers={len(providers_status)}")

    return {
        "status": status,
        "providers": providers_status
    }
