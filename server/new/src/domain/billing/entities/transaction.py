"""
@file transaction.py
@summary Transactionエンティティ - 取引履歴
@responsibility トークン関連取引の履歴を管理するドメインエンティティ
"""

import json
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any


class TransactionType(Enum):
    """取引タイプ"""
    PURCHASE = "purchase"  # クレジット購入
    ALLOCATION = "allocation"  # クレジット→トークン配分
    CONSUMPTION = "consumption"  # トークン消費


@dataclass
class Transaction:
    """取引履歴エンティティ

    すべてのトークン関連取引を記録する。

    ビジネスルール:
    - user_idは必須
    - typeはTransactionTypeのいずれか
    - amountは常に正の整数
    - purchase以外はmodel_idが必須
    - created_atは変更不可（履歴の改ざん防止）
    """

    user_id: str
    type: TransactionType
    amount: int
    model_id: str | None = None
    transaction_id: str | None = None  # IAP購入IDなど
    transaction_metadata: dict[str, Any] | None = None
    created_at: datetime = field(default_factory=datetime.now)
    id: int | None = None  # 永続化後にDBから設定される

    def __post_init__(self):
        """初期化後のバリデーション"""
        self._validate()
        # Enum型の変換
        if isinstance(self.type, str):
            self.type = TransactionType(self.type)

    def _validate(self):
        """ビジネスルールのバリデーション"""
        if not self.user_id:
            raise ValueError("user_id is required")

        # typeをEnumに変換（文字列の場合）
        if isinstance(self.type, str):
            try:
                type_enum = TransactionType(self.type)
            except ValueError as e:
                valid_types = [t.value for t in TransactionType]
                raise ValueError(f"type must be one of {valid_types}, got {self.type}") from e
        else:
            type_enum = self.type

        if self.amount <= 0:
            raise ValueError(f"amount must be positive, got {self.amount}")

        # allocation と consumption の場合はmodel_idが必須
        if type_enum in [TransactionType.ALLOCATION, TransactionType.CONSUMPTION]:
            if not self.model_id:
                raise ValueError(f"{type_enum.value} transaction requires model_id")

    def to_dict(self) -> dict[str, Any]:
        """辞書形式に変換（レスポンス用）

        Returns:
            Dict: 取引情報の辞書
        """
        return {
            "id": self.id,
            "type": self.type.value if isinstance(self.type, TransactionType) else self.type,
            "amount": self.amount,
            "model_id": self.model_id,
            "created_at": self.created_at.isoformat() if self.created_at else "",
        }

    def get_metadata_json(self) -> str:
        """メタデータをJSON文字列に変換

        Returns:
            str: JSON文字列、メタデータがない場合は空の辞書
        """
        return json.dumps(self.transaction_metadata or {})

    @staticmethod
    def create_purchase(
        user_id: str,
        credits: int,
        transaction_id: str,
        purchase_record: dict[str, Any]
    ) -> "Transaction":
        """購入トランザクションを作成

        Args:
            user_id: ユーザーID
            credits: 購入したクレジット額
            transaction_id: IAP取引ID
            purchase_record: 購入レコード情報

        Returns:
            Transaction: 購入トランザクション
        """
        return Transaction(
            user_id=user_id,
            type=TransactionType.PURCHASE,
            amount=credits,
            transaction_id=transaction_id,
            transaction_metadata=purchase_record,
            created_at=datetime.now()
        )

    @staticmethod
    def create_allocation(
        user_id: str,
        model_id: str,
        credits: int,
        tokens_allocated: int
    ) -> "Transaction":
        """配分トランザクションを作成

        Args:
            user_id: ユーザーID
            model_id: 配分先モデルID
            credits: 配分したクレジット額
            tokens_allocated: 配分されたトークン数

        Returns:
            Transaction: 配分トランザクション
        """
        return Transaction(
            user_id=user_id,
            type=TransactionType.ALLOCATION,
            amount=credits,
            model_id=model_id,
            transaction_metadata={"tokens_allocated": tokens_allocated},
            created_at=datetime.now()
        )

    @staticmethod
    def create_consumption(
        user_id: str,
        model_id: str,
        total_tokens: int,
        input_tokens: int,
        output_tokens: int
    ) -> "Transaction":
        """消費トランザクションを作成

        Args:
            user_id: ユーザーID
            model_id: 消費したモデルID
            total_tokens: 合計消費トークン数
            input_tokens: 入力トークン数
            output_tokens: 出力トークン数

        Returns:
            Transaction: 消費トランザクション
        """
        return Transaction(
            user_id=user_id,
            type=TransactionType.CONSUMPTION,
            amount=total_tokens,
            model_id=model_id,
            transaction_metadata={
                "input_tokens": input_tokens,
                "output_tokens": output_tokens
            },
            created_at=datetime.now()
        )
