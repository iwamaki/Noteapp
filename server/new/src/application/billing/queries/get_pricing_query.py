"""
@file get_pricing_query.py
@summary GetPricingQuery - 価格情報取得クエリ
@responsibility 全モデルの価格情報を取得してDTOに変換
"""

from src.application.billing.dtos.responses import PricingItem, PricingResponse
from src.domain.billing.services import PricingService


class GetPricingQuery:
    """価格情報取得クエリ

    全モデルの価格情報を取得する。

    責務:
    - 価格情報の取得
    - DTOへの変換
    """

    def __init__(self, pricing_service: PricingService):
        """初期化

        Args:
            pricing_service: 価格計算サービス
        """
        self.pricing_service = pricing_service

    async def execute(self) -> PricingResponse:
        """価格情報を取得

        Returns:
            PricingResponse: 価格情報レスポンス
        """
        # 価格情報取得
        pricing_data = await self.pricing_service.get_pricing()

        # DTOに変換
        pricing_items = {
            model_id: PricingItem(
                model_id=model_id,
                price_per_m_token=data["price_per_m_token"],
                category=data["category"],
            )
            for model_id, data in pricing_data.items()
        }

        return PricingResponse(pricing=pricing_items)
