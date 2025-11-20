"""
@file user_balance.py
@summary UserBalanceエンティティ - モデル別トークン残高
@responsibility ユーザーのモデル別トークン残高を管理するドメインエンティティ
"""

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class UserBalance:
    """ユーザー残高エンティティ（モデル別）

    特定のモデルに配分されたトークン残高を表現する。

    ビジネスルール:
    - user_idとmodel_idは必須
    - トークン数は常に0以上
    - 更新時はupdated_atが自動更新される
    """

    user_id: str
    model_id: str
    allocated_tokens: int = 0
    updated_at: datetime = field(default_factory=datetime.now)
    id: int | None = None  # 永続化後にDBから設定される

    def __post_init__(self):
        """初期化後のバリデーション"""
        self._validate()

    def _validate(self):
        """ビジネスルールのバリデーション"""
        if not self.user_id:
            raise ValueError("user_id is required")

        if not self.model_id:
            raise ValueError("model_id is required")

        if self.allocated_tokens < 0:
            raise ValueError(f"allocated_tokens must be non-negative, got {self.allocated_tokens}")

    def allocate_tokens(self, amount: int) -> "UserBalance":
        """トークンを配分する

        Args:
            amount: 配分するトークン数（正の整数）

        Returns:
            UserBalance: 新しいUserBalanceインスタンス（イミュータブル性）

        Raises:
            ValueError: amount が負の場合
        """
        if amount <= 0:
            raise ValueError(f"amount must be positive, got {amount}")

        return UserBalance(
            id=self.id,
            user_id=self.user_id,
            model_id=self.model_id,
            allocated_tokens=self.allocated_tokens + amount,
            updated_at=datetime.now()
        )

    def consume_tokens(self, amount: int) -> "UserBalance":
        """トークンを消費する

        Args:
            amount: 消費するトークン数（正の整数）

        Returns:
            UserBalance: 新しいUserBalanceインスタンス（イミュータブル性）

        Raises:
            ValueError: amount が残高を超える場合、または負の場合
        """
        if amount <= 0:
            raise ValueError(f"amount must be positive, got {amount}")

        if amount > self.allocated_tokens:
            raise ValueError(
                f"Insufficient tokens. Required: {amount}, Available: {self.allocated_tokens}"
            )

        return UserBalance(
            id=self.id,
            user_id=self.user_id,
            model_id=self.model_id,
            allocated_tokens=self.allocated_tokens - amount,
            updated_at=datetime.now()
        )

    def has_sufficient_tokens(self, required_amount: int) -> bool:
        """十分なトークンがあるかチェック

        Args:
            required_amount: 必要なトークン数

        Returns:
            bool: 十分なトークンがある場合True
        """
        return self.allocated_tokens >= required_amount

    def reset(self) -> "UserBalance":
        """トークンを0にリセット（デバッグ用）

        Returns:
            UserBalance: リセットされた新しいUserBalanceインスタンス
        """
        return UserBalance(
            id=self.id,
            user_id=self.user_id,
            model_id=self.model_id,
            allocated_tokens=0,
            updated_at=datetime.now()
        )
