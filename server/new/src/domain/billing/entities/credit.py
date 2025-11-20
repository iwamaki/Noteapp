"""
@file credit.py
@summary Creditエンティティ - 未配分クレジット
@responsibility ユーザーの購入済み未配分クレジットを管理するドメインエンティティ
"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Credit:
    """未配分クレジットエンティティ

    購入済みだがまだモデルに配分されていないクレジット（円建て）を表現する。

    ビジネスルール:
    - クレジット額は常に0以上
    - user_idは必須
    - 更新時はupdated_atが自動更新される
    """

    user_id: str
    credits: int = 0
    updated_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        """初期化後のバリデーション"""
        self._validate()

    def _validate(self):
        """ビジネスルールのバリデーション"""
        if not self.user_id:
            raise ValueError("user_id is required")

        if self.credits < 0:
            raise ValueError(f"credits must be non-negative, got {self.credits}")

    def add_credits(self, amount: int) -> "Credit":
        """クレジットを追加する

        Args:
            amount: 追加するクレジット額（正の整数）

        Returns:
            Credit: 新しいCreditインスタンス（イミュータブル性）

        Raises:
            ValueError: amount が負の場合
        """
        if amount <= 0:
            raise ValueError(f"amount must be positive, got {amount}")

        return Credit(
            user_id=self.user_id,
            credits=self.credits + amount,
            updated_at=datetime.now()
        )

    def deduct_credits(self, amount: int) -> "Credit":
        """クレジットを減算する

        Args:
            amount: 減算するクレジット額（正の整数）

        Returns:
            Credit: 新しいCreditインスタンス（イミュータブル性）

        Raises:
            ValueError: amount が残高を超える場合、または負の場合
        """
        if amount <= 0:
            raise ValueError(f"amount must be positive, got {amount}")

        if amount > self.credits:
            raise ValueError(
                f"Insufficient credits. Required: {amount}P, Available: {self.credits}P"
            )

        return Credit(
            user_id=self.user_id,
            credits=self.credits - amount,
            updated_at=datetime.now()
        )

    def has_sufficient_credits(self, required_amount: int) -> bool:
        """十分なクレジットがあるかチェック

        Args:
            required_amount: 必要なクレジット額

        Returns:
            bool: 十分なクレジットがある場合True
        """
        return self.credits >= required_amount

    def reset(self) -> "Credit":
        """クレジットを0にリセット（デバッグ用）

        Returns:
            Credit: リセットされた新しいCreditインスタンス
        """
        return Credit(
            user_id=self.user_id,
            credits=0,
            updated_at=datetime.now()
        )
