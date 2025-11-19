"""
@file requests.py
@summary Request DTOs - API入力データの構造定義
@responsibility リクエストデータのバリデーションと構造化
"""

from dataclasses import dataclass
from typing import Any


@dataclass
class AddCreditsRequest:
    """クレジット追加リクエスト

    購入完了後にクレジットを追加する際のリクエストデータ。
    """

    credits: int
    purchase_record: dict[str, Any]

    def __post_init__(self):
        """バリデーション"""
        if self.credits <= 0:
            raise ValueError("credits must be positive")

        if not isinstance(self.purchase_record, dict):
            raise ValueError("purchase_record must be a dictionary")


@dataclass
class AllocationItem:
    """配分アイテム"""

    model_id: str
    credits: int

    def __post_init__(self):
        """バリデーション"""
        if not self.model_id:
            raise ValueError("model_id is required")

        if self.credits <= 0:
            raise ValueError("credits must be positive")


@dataclass
class AllocateCreditsRequest:
    """クレジット配分リクエスト

    未配分クレジットを各モデルにトークンとして配分する際のリクエストデータ。
    """

    allocations: list[AllocationItem]

    def __post_init__(self):
        """バリデーション"""
        if not self.allocations:
            raise ValueError("allocations must not be empty")

        for allocation in self.allocations:
            if not isinstance(allocation, AllocationItem):
                raise ValueError("allocations must contain AllocationItem instances")


@dataclass
class ConsumeTokensRequest:
    """トークン消費リクエスト

    LLM使用時にトークンを消費する際のリクエストデータ。
    """

    model_id: str
    input_tokens: int
    output_tokens: int

    def __post_init__(self):
        """バリデーション"""
        if not self.model_id:
            raise ValueError("model_id is required")

        if self.input_tokens < 0:
            raise ValueError("input_tokens must be non-negative")

        if self.output_tokens < 0:
            raise ValueError("output_tokens must be non-negative")

        if self.input_tokens + self.output_tokens == 0:
            raise ValueError("total tokens must be positive")
