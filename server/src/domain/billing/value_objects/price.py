"""
@file price.py
@summary Price値オブジェクト - 価格
@responsibility 価格（円/Mトークン）を表現する不変値オブジェクト
"""

from dataclasses import dataclass

from .credit_amount import CreditAmount
from .token_amount import TokenAmount


@dataclass(frozen=True)
class Price:
    """価格値オブジェクト

    価格（円/Mトークン）を表現する不変オブジェクト。

    ビジネスルール:
    - 価格は常に正の整数
    - 不変（frozen=True）
    - 値の等価性による比較
    """

    value: int  # 円/Mトークン

    def __post_init__(self):
        """初期化後のバリデーション"""
        if self.value <= 0:
            raise ValueError(f"Price must be positive, got {self.value}")

    def calculate_tokens_from_credits(self, credits: CreditAmount) -> TokenAmount:
        """クレジット額からトークン数を計算

        Args:
            credits: クレジット額

        Returns:
            TokenAmount: トークン数
        """
        if credits.value == 0:
            return TokenAmount.zero()

        tokens = int((credits.value / self.value) * 1_000_000)
        return TokenAmount(tokens)

    def calculate_credits_from_tokens(self, tokens: TokenAmount) -> CreditAmount:
        """トークン数からクレジット額を計算

        Args:
            tokens: トークン数

        Returns:
            CreditAmount: クレジット額
        """
        if tokens.value == 0:
            return CreditAmount.zero()

        credits = int((tokens.value / 1_000_000) * self.value)
        return CreditAmount(credits)

    def __int__(self) -> int:
        """整数値として取得"""
        return self.value

    def __str__(self) -> str:
        """文字列表現"""
        return f"{self.value}P/M tokens"

    @classmethod
    def from_int(cls, value: int) -> "Price":
        """整数からPriceを作成

        Args:
            value: 価格（円/Mトークン）

        Returns:
            Price: 価格
        """
        return cls(value)
