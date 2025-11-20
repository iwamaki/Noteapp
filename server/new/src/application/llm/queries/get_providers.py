"""
Application Layer - Get Providers Query

プロバイダー一覧取得クエリを定義します。
CQRSパターンにおけるQueryの実装です。

責務:
- 利用可能なLLMプロバイダーの情報を取得
- APIキーの設定状況を確認してステータスを判定
- プロバイダー情報をDTOに変換
"""


from src.application.llm.dto.provider_dto import ModelMetadataDTO, ProviderDTO
from src.domain.llm.providers.registry import _get_registry
from src.infrastructure.config.settings import get_settings
from src.infrastructure.logging.logger import get_logger

settings = get_settings()
logger = get_logger("get_providers_query")


class GetProvidersQuery:
    """プロバイダー一覧取得Query

    CQRSパターンにおけるQueryの実装。
    登録されているすべてのLLMプロバイダーの情報を取得します。

    処理内容:
    1. Registryから全プロバイダー設定を取得
    2. 各プロバイダーのAPIキー設定状況を確認
    3. モデルリストとメタデータを収集
    4. DTO形式に変換して返却
    """

    def __init__(self):
        """コンストラクタ"""
        pass

    async def execute(self) -> dict[str, ProviderDTO]:
        """利用可能なLLMプロバイダーを取得

        Returns:
            Dict[str, ProviderDTO]: プロバイダー名をキーとした辞書
                - key: プロバイダー名（"gemini", "openai"等）
                - value: ProviderDTO
                    - name: 表示名（"Google Gemini"等）
                    - default_model: デフォルトモデルID
                    - models: 利用可能なモデルIDリスト
                    - status: "available"（APIキー設定済み）または"unavailable"
                    - model_metadata: モデルメタデータの辞書
        """
        logger.info("Executing GetProvidersQuery")

        # メタデータを初期化（遅延初期化、循環依存回避）
        settings._ensure_metadata_initialized()

        providers = {}

        # すべてのプロバイダーをレジストリからループ処理
        for provider_name, provider_config in _get_registry().items():
            # API keyの存在を確認してステータスを判定
            api_key_field = provider_config.get_api_key_field()
            api_key = getattr(settings, api_key_field, None)
            status = "available" if api_key else "unavailable"

            logger.debug(
                f"Provider '{provider_name}': status={status}, "
                f"api_key_field={api_key_field}, api_key_set={bool(api_key)}"
            )

            # このプロバイダーのモデルリストを取得
            models = provider_config.get_model_ids()

            # モデルメタデータをDTOに変換
            model_metadata_dto = {}
            for model_id in models:
                # Registryからメタデータを取得
                metadata = provider_config.models.get(model_id)
                if metadata:
                    model_metadata_dto[model_id] = ModelMetadataDTO(
                        category=metadata.category,
                        display_name=metadata.display_name,
                        description=metadata.description,
                        recommended=metadata.recommended
                    )

            # ProviderDTOを生成
            providers[provider_name] = ProviderDTO(
                name=provider_config.display_name,
                default_model=provider_config.default_model,
                models=models,
                status=status,
                model_metadata=model_metadata_dto if model_metadata_dto else None
            )

        logger.info(
            f"GetProvidersQuery completed: {len(providers)} providers, "
            f"available={sum(1 for p in providers.values() if p.status == 'available')}"
        )

        return providers
