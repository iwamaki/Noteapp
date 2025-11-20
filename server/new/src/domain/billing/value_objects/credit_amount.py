"""
@file credit_amount.py
@summary CreditAmount値オブジェクト - クレジット量
@responsibility クレジット量を表現する不変値オブジェクト
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class CreditAmount:
    """クレジット量値オブジェクト

    クレジット額（円建て）を表現する不変オブジェクト。

    ビジネスルール:
    - クレジット額は常に0以上
    - 不変（frozen=True）
    - 値の等価性による比較
    """

    value: int

    def __post_init__(self):
        """初期化後のバリデーション"""
        if self.value < 0:
            raise ValueError(f"Credit amount must be non-negative, got {self.value}")

    def add(self, other: "CreditAmount") -> "CreditAmount":
        """クレジット額を加算する

        Args:
            other: 加算するクレジット額

        Returns:
            CreditAmount: 新しいCreditAmountインスタンス
        """
        return CreditAmount(self.value + other.value)

    def subtract(self, other: "CreditAmount") -> "CreditAmount":
        """クレジット額を減算する

        Args:
            other: 減算するクレジット額

        Returns:
            CreditAmount: 新しいCreditAmountインスタンス

        Raises:
            ValueError: 減算結果が負になる場合
        """
        new_value = self.value - other.value
        if new_value < 0:
            raise ValueError(
                f"Resulting credit amount cannot be negative: {self.value} - {other.value}"
            )
        return CreditAmount(new_value)

    def is_sufficient_for(self, required: "CreditAmount") -> bool:
        """必要なクレジット額が十分にあるかチェック

        Args:
            required: 必要なクレジット額

        Returns:
            bool: 十分なクレジット額がある場合True
        """
        return self.value >= required.value

    def __int__(self) -> int:
        """整数値として取得"""
        return self.value

    def __str__(self) -> str:
        """文字列表現"""
        return f"{self.value:,}P"

    @classmethod
    def zero(cls) -> "CreditAmount":
        """ゼロクレジットを作成

        Returns:
            CreditAmount: ゼロクレジット
        """
        return cls(0)

    @classmethod
    def from_int(cls, value: int) -> "CreditAmount":
        """整数からCreditAmountを作成

        Args:
            value: クレジット額

        Returns:
            CreditAmount: クレジット量
        """
        return cls(value)
