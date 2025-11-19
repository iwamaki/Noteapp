"""
@file responses.py
@summary Response DTOs - API出力データの構造定義
@responsibility レスポンスデータの構造化とシリアライゼーション
"""

from dataclasses import asdict, dataclass
from typing import Any


@dataclass
class BalanceResponse:
    """残高レスポンス

    未配分クレジットとモデル別トークン残高の情報。
    """

    credits: int
    allocated_tokens: dict[str, int]

    def to_dict(self) -> dict[str, Any]:
        """辞書に変換"""
        return asdict(self)


@dataclass
class TransactionItem:
    """取引アイテム"""

    id: int
    type: str
    amount: int
    model_id: str | None
    created_at: str

    def to_dict(self) -> dict[str, Any]:
        """辞書に変換"""
        return asdict(self)


@dataclass
class TransactionResponse:
    """取引履歴レスポンス"""

    transactions: list[TransactionItem]

    def to_dict(self) -> dict[str, Any]:
        """辞書に変換"""
        return {
            "transactions": [t.to_dict() for t in self.transactions]
        }


@dataclass
class PricingItem:
    """価格情報アイテム"""

    model_id: str
    price_per_m_token: int
    category: str

    def to_dict(self) -> dict[str, Any]:
        """辞書に変換"""
        return asdict(self)


@dataclass
class PricingResponse:
    """価格情報レスポンス"""

    pricing: dict[str, PricingItem]

    def to_dict(self) -> dict[str, Any]:
        """辞書に変換"""
        return {
            model_id: item.to_dict()
            for model_id, item in self.pricing.items()
        }


@dataclass
class OperationResponse:
    """汎用操作結果レスポンス

    成功/失敗の結果とメッセージ、追加データを含む。
    """

    success: bool
    message: str
    data: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        """辞書に変換"""
        result = {
            "success": self.success,
            "message": self.message,
        }

        if self.data:
            result.update(self.data)

        return result
