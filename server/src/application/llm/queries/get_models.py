"""
Application Layer - Get Models Query

モデル一覧取得クエリを定義します。
CQRSパターンにおけるQueryの実装です。

責務:
- 特定プロバイダーのモデル一覧を取得
- モデルメタデータをDTOに変換
"""

from typing import Dict, Optional
from src.application.llm.dto.provider_dto import ModelMetadataDTO
from src.domain.llm.providers.registry import get_provider_config, _get_registry
from src.core.logger import logger


class GetModelsQuery:
    """モデル一覧取得Query

    CQRSパターンにおけるQueryの実装。
    特定のプロバイダーまたは全プロバイダーのモデル一覧を取得します。
    """

    def __init__(self):
        """コンストラクタ"""
        pass

    async def execute(
        self,
        provider_name: Optional[str] = None
    ) -> Dict[str, ModelMetadataDTO]:
        """モデル一覧を取得

        Args:
            provider_name: プロバイダー名（"gemini", "openai"等）
                Noneの場合は全プロバイダーのモデルを取得

        Returns:
            Dict[str, ModelMetadataDTO]: モデルIDをキーとした辞書
                - key: モデルID（"gemini-2.5-flash"等）
                - value: ModelMetadataDTO
                    - category: "quick" or "think"
                    - display_name: 表示名
                    - description: 説明
                    - recommended: 推奨フラグ
        """
        if provider_name:
            # 特定プロバイダーのモデルを取得
            logger.info(f"Executing GetModelsQuery for provider: {provider_name}")
            return await self._get_provider_models(provider_name)
        else:
            # 全プロバイダーのモデルを取得
            logger.info("Executing GetModelsQuery for all providers")
            return await self._get_all_models()

    async def _get_provider_models(
        self,
        provider_name: str
    ) -> Dict[str, ModelMetadataDTO]:
        """特定プロバイダーのモデル一覧を取得

        Args:
            provider_name: プロバイダー名

        Returns:
            Dict[str, ModelMetadataDTO]: モデル一覧
                プロバイダーが存在しない場合は空の辞書
        """
        provider_config = get_provider_config(provider_name)

        if not provider_config:
            logger.warning(f"Provider not found: {provider_name}")
            return {}

        models = {}
        for model_id, metadata in provider_config.models.items():
            models[model_id] = ModelMetadataDTO(
                category=metadata.category,
                display_name=metadata.display_name,
                description=metadata.description,
                recommended=metadata.recommended
            )

        logger.info(
            f"GetModelsQuery completed for '{provider_name}': "
            f"{len(models)} models"
        )

        return models

    async def _get_all_models(self) -> Dict[str, ModelMetadataDTO]:
        """全プロバイダーのモデル一覧を取得

        Returns:
            Dict[str, ModelMetadataDTO]: 全モデル一覧
        """
        all_models = {}

        # すべてのプロバイダーをループ
        for provider_name, provider_config in _get_registry().items():
            for model_id, metadata in provider_config.models.items():
                all_models[model_id] = ModelMetadataDTO(
                    category=metadata.category,
                    display_name=metadata.display_name,
                    description=metadata.description,
                    recommended=metadata.recommended
                )

        logger.info(
            f"GetModelsQuery completed for all providers: "
            f"{len(all_models)} models"
        )

        return all_models
