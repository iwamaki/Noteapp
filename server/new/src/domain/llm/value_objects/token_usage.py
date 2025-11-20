"""
LLM Domain - TokenUsage Value Object

トークン使用量値オブジェクトを定義します。
LLMの使用トークン数と関連情報を表現する不変オブジェクトです。

責務:
- トークン使用量の不変性保証
- 使用率の計算
- 要約必要性の判定ロジック
"""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class TokenUsage:
    """
    トークン使用量値オブジェクト（不変）

    会話履歴のトークン使用量と、今回のリクエストで実際に使用した
    トークン数を保持します。

    Attributes:
        current_tokens: 現在の会話履歴のトークン数
        max_tokens: 推奨される最大トークン数
        input_tokens: 今回のリクエストの入力トークン数（課金対象）
        output_tokens: 今回のリクエストの出力トークン数（課金対象）
        total_tokens: 今回のリクエストの合計トークン数
    """
    current_tokens: int
    max_tokens: int
    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None

    def __post_init__(self):
        """初期化後のバリデーション"""
        if self.current_tokens < 0:
            raise ValueError(
                f"current_tokens must be non-negative, got {self.current_tokens}"
            )
        if self.max_tokens <= 0:
            raise ValueError(
                f"max_tokens must be positive, got {self.max_tokens}"
            )
        if self.input_tokens is not None and self.input_tokens < 0:
            raise ValueError(
                f"input_tokens must be non-negative, got {self.input_tokens}"
            )
        if self.output_tokens is not None and self.output_tokens < 0:
            raise ValueError(
                f"output_tokens must be non-negative, got {self.output_tokens}"
            )
        if self.total_tokens is not None and self.total_tokens < 0:
            raise ValueError(
                f"total_tokens must be non-negative, got {self.total_tokens}"
            )

    def get_usage_ratio(self) -> float:
        """
        使用率を計算（0.0-1.0）

        Returns:
            使用率（current_tokens / max_tokens）
        """
        if self.max_tokens == 0:
            return 0.0
        return min(self.current_tokens / self.max_tokens, 1.0)

    def get_usage_percentage(self) -> float:
        """
        使用率をパーセンテージで取得（0.0-100.0）

        Returns:
            使用率（%）
        """
        return self.get_usage_ratio() * 100.0

    def needs_summary(self, threshold: float = 0.8) -> bool:
        """
        要約が必要かどうかを判定

        Args:
            threshold: 閾値（デフォルト: 0.8 = 80%）

        Returns:
            要約が推奨される場合True
        """
        return self.get_usage_ratio() >= threshold

    def get_remaining_tokens(self) -> int:
        """
        残りトークン数を取得

        Returns:
            残りトークン数（max_tokens - current_tokens）
        """
        return max(0, self.max_tokens - self.current_tokens)

    def is_near_limit(self, threshold: float = 0.9) -> bool:
        """
        制限に近づいているかどうか

        Args:
            threshold: 閾値（デフォルト: 0.9 = 90%）

        Returns:
            制限に近い場合True
        """
        return self.get_usage_ratio() >= threshold

    def is_over_limit(self) -> bool:
        """
        制限を超えているかどうか

        Returns:
            制限を超えている場合True
        """
        return self.current_tokens > self.max_tokens

    def has_actual_usage(self) -> bool:
        """
        実際の使用量情報があるかどうか

        Returns:
            input_tokens, output_tokens, total_tokensのいずれかが設定されている場合True
        """
        return any([
            self.input_tokens is not None,
            self.output_tokens is not None,
            self.total_tokens is not None
        ])

    def get_cost_multiplier(self) -> tuple[float, float]:
        """
        コスト計算用の倍率を取得

        入力と出力のトークン数を百万単位で返します（料金計算用）

        Returns:
            (input_millions, output_millions)のタプル
        """
        input_millions = (self.input_tokens or 0) / 1_000_000
        output_millions = (self.output_tokens or 0) / 1_000_000
        return (input_millions, output_millions)

    def to_dict(self) -> dict[str, Any]:
        """辞書形式に変換（シリアライゼーション用）"""
        return {
            "currentTokens": self.current_tokens,
            "maxTokens": self.max_tokens,
            "usageRatio": self.get_usage_ratio(),
            "needsSummary": self.needs_summary(),
            "inputTokens": self.input_tokens,
            "outputTokens": self.output_tokens,
            "totalTokens": self.total_tokens
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "TokenUsage":
        """辞書から復元（デシリアライゼーション用）"""
        return cls(
            current_tokens=data["currentTokens"],
            max_tokens=data["maxTokens"],
            input_tokens=data.get("inputTokens"),
            output_tokens=data.get("outputTokens"),
            total_tokens=data.get("totalTokens")
        )

    @classmethod
    def create_empty(cls, max_tokens: int = 4000) -> "TokenUsage":
        """空の使用量情報を作成"""
        return cls(
            current_tokens=0,
            max_tokens=max_tokens
        )

    @classmethod
    def create_with_actual_usage(
        cls,
        current_tokens: int,
        max_tokens: int,
        input_tokens: int,
        output_tokens: int,
        total_tokens: int | None = None
    ) -> "TokenUsage":
        """実際の使用量情報付きで作成"""
        return cls(
            current_tokens=current_tokens,
            max_tokens=max_tokens,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=total_tokens or (input_tokens + output_tokens)
        )

    def __repr__(self) -> str:
        return (
            f"TokenUsage(current={self.current_tokens}/{self.max_tokens}, "
            f"usage={self.get_usage_percentage():.1f}%, "
            f"needs_summary={self.needs_summary()})"
        )
