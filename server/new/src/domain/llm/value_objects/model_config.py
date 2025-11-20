"""
LLM Domain - ModelConfig Value Object

モデル設定値オブジェクトを定義します。
LLMプロバイダーとモデルの設定を表現する不変オブジェクトです。

責務:
- モデル設定の不変性保証
- 設定の妥当性検証
- プロバイダー/モデルの組み合わせ管理
"""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ModelConfig:
    """
    モデル設定値オブジェクト（不変）

    LLMプロバイダーとモデルの設定を保持します。
    frozen=Trueにより不変性を保証します。

    Attributes:
        provider: プロバイダー名（"gemini", "openai"等）
        model: モデルID
        temperature: 温度パラメータ（0.0-1.0）
        max_tokens: 最大トークン数
        top_p: トップPサンプリング
        metadata: 追加のメタデータ
    """
    provider: str
    model: str
    temperature: float = 0.7
    max_tokens: int | None = None
    top_p: float = 1.0
    metadata: dict[str, Any] = None

    def __post_init__(self):
        """初期化後のバリデーション"""
        # プロバイダー検証
        if not self.provider:
            raise ValueError("provider cannot be empty")

        # モデル検証
        if not self.model:
            raise ValueError("model cannot be empty")

        # temperature検証
        if not 0.0 <= self.temperature <= 2.0:
            raise ValueError(
                f"temperature must be between 0.0 and 2.0, got {self.temperature}"
            )

        # top_p検証
        if not 0.0 <= self.top_p <= 1.0:
            raise ValueError(
                f"top_p must be between 0.0 and 1.0, got {self.top_p}"
            )

        # max_tokens検証
        if self.max_tokens is not None and self.max_tokens <= 0:
            raise ValueError(
                f"max_tokens must be positive, got {self.max_tokens}"
            )

        # metadataのデフォルト値設定（frozen=Trueなので__post_init__では変更不可）
        # この問題を回避するため、field(default_factory=dict)を使用する代わりに
        # Noneをデフォルトにし、使用時にmetadata or {}とする

    @classmethod
    def create_default(cls, provider: str, model: str) -> "ModelConfig":
        """デフォルト設定でModelConfigを作成"""
        return cls(
            provider=provider,
            model=model,
            temperature=0.7,
            top_p=1.0,
            metadata={}
        )

    @classmethod
    def create_deterministic(cls, provider: str, model: str) -> "ModelConfig":
        """決定的な出力のための設定（temperature=0）"""
        return cls(
            provider=provider,
            model=model,
            temperature=0.0,
            top_p=1.0,
            metadata={}
        )

    @classmethod
    def create_creative(cls, provider: str, model: str) -> "ModelConfig":
        """創造的な出力のための設定（temperature=1.0）"""
        return cls(
            provider=provider,
            model=model,
            temperature=1.0,
            top_p=0.95,
            metadata={}
        )

    def with_temperature(self, temperature: float) -> "ModelConfig":
        """温度パラメータを変更した新しいインスタンスを返す"""
        return ModelConfig(
            provider=self.provider,
            model=self.model,
            temperature=temperature,
            max_tokens=self.max_tokens,
            top_p=self.top_p,
            metadata=self.metadata
        )

    def with_max_tokens(self, max_tokens: int) -> "ModelConfig":
        """最大トークン数を変更した新しいインスタンスを返す"""
        return ModelConfig(
            provider=self.provider,
            model=self.model,
            temperature=self.temperature,
            max_tokens=max_tokens,
            top_p=self.top_p,
            metadata=self.metadata
        )

    def is_gemini(self) -> bool:
        """Geminiプロバイダーかどうか"""
        return self.provider.lower() == "gemini"

    def is_openai(self) -> bool:
        """OpenAIプロバイダーかどうか"""
        return self.provider.lower() == "openai"

    def get_provider_display_name(self) -> str:
        """プロバイダーの表示名を取得"""
        provider_names = {
            "gemini": "Google Gemini",
            "openai": "OpenAI",
        }
        return provider_names.get(self.provider.lower(), self.provider)

    def to_dict(self) -> dict[str, Any]:
        """辞書形式に変換"""
        return {
            "provider": self.provider,
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "top_p": self.top_p,
            "metadata": self.metadata or {}
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ModelConfig":
        """辞書から復元"""
        return cls(
            provider=data["provider"],
            model=data["model"],
            temperature=data.get("temperature", 0.7),
            max_tokens=data.get("max_tokens"),
            top_p=data.get("top_p", 1.0),
            metadata=data.get("metadata")
        )

    def __repr__(self) -> str:
        return (
            f"ModelConfig(provider={self.provider}, "
            f"model={self.model}, "
            f"temperature={self.temperature})"
        )
