"""
@file pricing_service.py
@summary PricingServiceドメインサービス - 価格計算
@responsibility 価格情報管理・クレジット/トークン変換のビジネスロジック
"""

from typing import Any

from ..entities.pricing import Pricing, PricingCategory
from ..repositories.pricing_repository import PricingRepository


class PricingService:
    """価格計算ドメインサービス

    価格情報の管理、クレジット/トークン変換に関するビジネスロジックを提供する。

    責務:
    - 価格情報の取得・管理
    - クレジット→トークン変換
    - トークン→クレジット変換
    """

    def __init__(self, pricing_repo: PricingRepository):
        """初期化

        Args:
            pricing_repo: 価格情報リポジトリ
        """
        self.pricing_repo = pricing_repo

    async def get_pricing(self) -> dict[str, dict[str, Any]]:
        """全モデルの価格情報を取得

        Returns:
            Dict[str, Dict]: {
                "model_id": {
                    "price_per_m_token": int,
                    "category": str
                },
                ...
            }
        """
        pricings = await self.pricing_repo.find_all()

        return {p.model_id: p.to_dict() for p in pricings}

    async def get_pricing_by_model(self, model_id: str) -> Pricing:
        """モデルの価格情報を取得

        Args:
            model_id: モデルID

        Returns:
            Pricing: 価格情報エンティティ

        Raises:
            ValueError: 価格情報が見つからない場合
        """
        pricing = await self.pricing_repo.find_by_model(model_id)

        if not pricing:
            raise ValueError(f"モデル {model_id} の価格情報が見つかりません")

        return pricing

    async def credits_to_tokens(
        self, model_id: str, credits: int
    ) -> int:
        """クレジット額からトークン数を計算

        Args:
            model_id: モデルID
            credits: クレジット額（円）

        Returns:
            int: トークン数

        Raises:
            ValueError: 価格情報が見つからない場合
        """
        if credits < 0:
            raise ValueError(f"credits must be non-negative, got {credits}")

        if credits == 0:
            return 0

        pricing = await self.get_pricing_by_model(model_id)

        return pricing.calculate_tokens_from_credits(credits)

    async def tokens_to_credits(
        self, model_id: str, tokens: int
    ) -> int:
        """トークン数からクレジット額を計算

        Args:
            model_id: モデルID
            tokens: トークン数

        Returns:
            int: クレジット額（円）

        Raises:
            ValueError: 価格情報が見つからない場合
        """
        if tokens < 0:
            raise ValueError(f"tokens must be non-negative, got {tokens}")

        if tokens == 0:
            return 0

        pricing = await self.get_pricing_by_model(model_id)

        return pricing.calculate_credits_from_tokens(tokens)

    async def calculate_max_allocatable_tokens(
        self, model_id: str, available_credits: int, category_capacity_limit: int,
        current_category_total: int, current_model_tokens: int
    ) -> int:
        """配分可能な最大トークン数を計算

        Args:
            model_id: モデルID
            available_credits: 利用可能なクレジット額
            category_capacity_limit: カテゴリー容量制限
            current_category_total: 現在のカテゴリー合計トークン数
            current_model_tokens: 現在のモデルトークン数

        Returns:
            int: 配分可能な最大トークン数

        Raises:
            ValueError: 価格情報が見つからない場合
        """
        pricing = await self.get_pricing_by_model(model_id)

        # 利用可能なクレジットから計算されるトークン数
        tokens_from_credits = pricing.calculate_tokens_from_credits(available_credits)

        # 容量制限から計算される最大トークン数
        remaining_capacity = category_capacity_limit - (current_category_total - current_model_tokens)
        max_tokens_by_capacity = max(0, remaining_capacity)

        # 小さい方を返す
        return min(tokens_from_credits, max_tokens_by_capacity)

    async def update_pricing(
        self, model_id: str, new_price: int
    ) -> Pricing:
        """価格を更新する

        Args:
            model_id: モデルID
            new_price: 新しい価格（円/Mトークン）

        Returns:
            Pricing: 更新された価格情報エンティティ

        Raises:
            ValueError: 価格情報が見つからない、または価格が不正な場合
        """
        pricing = await self.get_pricing_by_model(model_id)

        updated_pricing = pricing.update_price(new_price)

        saved_pricing = await self.pricing_repo.save(updated_pricing)

        return saved_pricing

    async def initialize_pricing(
        self, pricing_data: list[dict[str, Any]]
    ) -> list[Pricing]:
        """価格情報を一括初期化（初回セットアップ用）

        Args:
            pricing_data: 価格情報のリスト [
                {
                    "model_id": str,
                    "price_per_m_token": int,
                    "category": str,
                    "exchange_rate": int,
                    "margin_percent": int
                },
                ...
            ]

        Returns:
            List[Pricing]: 保存された価格情報エンティティのリスト
        """
        pricings = []

        for data in pricing_data:
            pricing = Pricing(
                model_id=data["model_id"],
                price_per_m_token=data["price_per_m_token"],
                category=PricingCategory(data["category"]),
                exchange_rate=data.get("exchange_rate"),
                margin_percent=data.get("margin_percent"),
            )
            pricings.append(pricing)

        saved_pricings = await self.pricing_repo.save_all(pricings)

        return saved_pricings
