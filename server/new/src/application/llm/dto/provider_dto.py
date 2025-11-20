"""
Application Layer - Provider DTOs

プロバイダー関連のデータ転送オブジェクト（DTO）を定義します。
"""

from dataclasses import dataclass


@dataclass
class ModelMetadataDTO:
    """モデルメタデータDTO"""
    category: str  # "quick" or "think"
    display_name: str | None = None
    description: str | None = None
    recommended: bool = False


@dataclass
class ProviderDTO:
    """プロバイダーDTO"""
    name: str
    default_model: str
    models: list[str]
    status: str  # "available" or "unavailable"
    model_metadata: dict[str, ModelMetadataDTO] | None = None
