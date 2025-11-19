"""
@file token_amount.py
@summary TokenAmount値オブジェクト - トークン量
@responsibility トークン量を表現する不変値オブジェクト
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class TokenAmount:
    """トークン量値オブジェクト

    トークン数を表現する不変オブジェクト。

    ビジネスルール:
    - トークン数は常に0以上
    - 不変（frozen=True）
    - 値の等価性による比較
    """

    value: int

    def __post_init__(self):
        """初期化後のバリデーション"""
        if self.value < 0:
            raise ValueError(f"Token amount must be non-negative, got {self.value}")

    def add(self, other: "TokenAmount") -> "TokenAmount":
        """トークン量を加算する

        Args:
            other: 加算するトークン量

        Returns:
            TokenAmount: 新しいTokenAmountインスタンス
        """
        return TokenAmount(self.value + other.value)

    def subtract(self, other: "TokenAmount") -> "TokenAmount":
        """トークン量を減算する

        Args:
            other: 減算するトークン量

        Returns:
            TokenAmount: 新しいTokenAmountインスタンス

        Raises:
            ValueError: 減算結果が負になる場合
        """
        new_value = self.value - other.value
        if new_value < 0:
            raise ValueError(
                f"Resulting token amount cannot be negative: {self.value} - {other.value}"
            )
        return TokenAmount(new_value)

    def is_sufficient_for(self, required: "TokenAmount") -> bool:
        """必要なトークン量が十分にあるかチェック

        Args:
            required: 必要なトークン量

        Returns:
            bool: 十分なトークン量がある場合True
        """
        return self.value >= required.value

    def __int__(self) -> int:
        """整数値として取得"""
        return self.value

    def __str__(self) -> str:
        """文字列表現"""
        return f"{self.value:,} tokens"

    @classmethod
    def zero(cls) -> "TokenAmount":
        """ゼロトークンを作成

        Returns:
            TokenAmount: ゼロトークン
        """
        return cls(0)

    @classmethod
    def from_int(cls, value: int) -> "TokenAmount":
        """整数からTokenAmountを作成

        Args:
            value: トークン数

        Returns:
            TokenAmount: トークン量
        """
        return cls(value)
