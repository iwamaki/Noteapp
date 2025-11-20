"""
LLM Provider Registry

すべてのLLMプロバイダーの設定を一元管理するレジストリ。
Single Source of Truth (SSOT) 原則に基づき、プロバイダーに関する
すべての情報をここで定義する。

主な利点:
- 新しいプロバイダー追加時の変更箇所を最小化
- プロバイダー設定の重複を排除
- モデルメタデータの一元管理
"""
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Literal

# 循環インポートを回避するため、TYPE_CHECKING 時のみインポート
if TYPE_CHECKING:
    from src.domain.llm.providers.base import BaseLLMProvider


@dataclass
class ModelMetadata:
    """モデルの基本メタデータ

    Attributes:
        category: モデルのカテゴリー（"quick": 高速モデル、"think": 高性能モデル）
        display_name: UIに表示するモデル名
        description: モデルの説明文
        recommended: 推奨モデルかどうか
    """
    category: Literal["quick", "think"]
    display_name: str
    description: str
    recommended: bool


@dataclass
class ProviderConfig:
    """プロバイダーの統一設定

    Attributes:
        provider_class: Providerクラス（GeminiProvider, OpenAIProviderなど）
        display_name: UIに表示するプロバイダー名
        default_model: デフォルトで使用するモデルID
        models: 利用可能なモデルとそのメタデータ
    """
    provider_class: type['BaseLLMProvider']  # 文字列型ヒント（循環依存回避）
    display_name: str
    default_model: str
    models: dict[str, ModelMetadata]

    def get_api_key_field(self) -> str:
        """API keyのフィールド名を取得

        例: GeminiProvider → "gemini_api_key"
            OpenAIProvider → "openai_api_key"

        Returns:
            API keyのフィールド名
        """
        provider_name = self.provider_class.__name__.replace("Provider", "").lower()
        return f"{provider_name}_api_key"

    def get_model_ids(self) -> list[str]:
        """利用可能なモデルIDのリストを取得

        Returns:
            モデルIDのリスト
        """
        return list(self.models.keys())


# ============================================================================
# PROVIDER_REGISTRY - Single Source of Truth
# ============================================================================
# すべてのプロバイダー設定をここで一元管理。
# 新しいプロバイダーを追加する場合は、ここに設定を追加するだけでOK。
#
# 循環インポート回避のため、レジストリは関数で遅延初期化される。
# ============================================================================

def _build_provider_registry() -> dict[str, ProviderConfig]:
    """プロバイダーレジストリを構築（遅延初期化）

    この関数は初回アクセス時に呼ばれ、プロバイダークラスを
    実行時にインポートすることで循環依存を回避する。
    """
    # 実行時にインポート（循環依存回避）
    from src.domain.llm.providers.gemini_provider import GeminiProvider
    from src.domain.llm.providers.openai_provider import OpenAIProvider

    return {
        # ========================================
        # Google Gemini
        # ========================================
        "gemini": ProviderConfig(
            provider_class=GeminiProvider,
            display_name="Google Gemini",
            default_model="gemini-2.5-flash",
            models={
                "gemini-2.5-flash": ModelMetadata(
                    category="quick",
                    display_name="Gemini 2.5 Flash",
                    description="高速・最新版（推奨）",
                    recommended=True,
                ),
                "gemini-2.5-pro": ModelMetadata(
                    category="think",
                    display_name="Gemini 2.5 Pro",
                    description="最高性能・複雑なタスク向け（推奨）",
                    recommended=True,
                ),
                "gemini-2.0-flash": ModelMetadata(
                    category="quick",
                    display_name="Gemini 2.0 Flash",
                    description="互換性・コスト重視",
                    recommended=False,
                ),
                "gemini-2.0-pro": ModelMetadata(
                    category="think",
                    display_name="Gemini 2.0 Pro",
                    description="互換性・コスト重視",
                    recommended=False,
                ),
            },
        ),

        # ========================================
        # OpenAI
        # ========================================
        "openai": ProviderConfig(
            provider_class=OpenAIProvider,
            display_name="OpenAI",
            default_model="gpt-5-mini",
            models={
                "gpt-5-mini": ModelMetadata(
                    category="quick",
                    display_name="GPT-5 Mini",
                    description="OpenAIの最新高速モデル（推奨）",
                    recommended=True,
                ),
            },
        ),
    }


# グローバル変数（遅延初期化）
_registry_cache: dict[str, ProviderConfig] | None = None


def _get_registry() -> dict[str, ProviderConfig]:
    """レジストリを取得（キャッシュ付き）"""
    global _registry_cache
    if _registry_cache is None:
        _registry_cache = _build_provider_registry()
    return _registry_cache


# モジュールレベルでの直接アクセスをサポート
def __getattr__(name: str) -> Any:
    """モジュールレベルの属性アクセスをハンドリング

    PROVIDER_REGISTRY へのアクセスを遅延初期化でサポートする。
    これにより、以下のようなインポートが可能になる:
        from src.llm.providers.registry import PROVIDER_REGISTRY
    """
    if name == "PROVIDER_REGISTRY":
        return _get_registry()
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")


# ============================================================================
# Utility Functions
# ============================================================================

def get_provider_config(provider_name: str) -> ProviderConfig | None:
    """プロバイダー設定を取得

    Args:
        provider_name: プロバイダー名（"gemini", "openai"など）

    Returns:
        ProviderConfig、または存在しない場合はNone
    """
    return _get_registry().get(provider_name)


def get_all_provider_names() -> list[str]:
    """すべてのプロバイダー名を取得

    Returns:
        プロバイダー名のリスト
    """
    return list(_get_registry().keys())


def get_model_metadata(model_id: str) -> ModelMetadata | None:
    """モデルIDからメタデータを取得

    Args:
        model_id: モデルID

    Returns:
        ModelMetadata、または存在しない場合はNone
    """
    for config in _get_registry().values():
        if model_id in config.models:
            return config.models[model_id]
    return None
