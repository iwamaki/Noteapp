"""
Application Layer - Provider DTOs

プロバイダー関連のデータ転送オブジェクト（DTO）を定義します。
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Any


@dataclass
class ModelMetadataDTO:
    """モデルメタデータDTO"""
    category: str  # "quick" or "think"
    display_name: Optional[str] = None
    description: Optional[str] = None
    recommended: bool = False


@dataclass
class ProviderDTO:
    """プロバイダーDTO"""
    name: str
    default_model: str
    models: List[str]
    status: str  # "available" or "unavailable"
    model_metadata: Optional[Dict[str, ModelMetadataDTO]] = None
