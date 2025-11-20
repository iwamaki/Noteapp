"""
@file pricing_repository.py
@summary PricingRepositoryインターフェース - 価格情報リポジトリ
@responsibility 価格情報のデータアクセスを抽象化
"""

from abc import ABC, abstractmethod

from ..entities.pricing import Pricing, PricingCategory


class PricingRepository(ABC):
    """価格情報リポジトリインターフェース

    Pricingエンティティのデータアクセスを抽象化する。
    具体的な実装（SQLAlchemy等）は Persistence 層で行う。
    """

    @abstractmethod
    async def find_by_model(self, model_id: str) -> Pricing | None:
        """モデルIDで価格情報を取得

        Args:
            model_id: モデルID

        Returns:
            Optional[Pricing]: 価格情報エンティティ、存在しない場合はNone
        """
        pass

    @abstractmethod
    async def find_all(self) -> list[Pricing]:
        """全モデルの価格情報を取得

        Returns:
            List[Pricing]: 価格情報エンティティのリスト
        """
        pass

    @abstractmethod
    async def find_by_category(self, category: PricingCategory) -> list[Pricing]:
        """カテゴリーで価格情報を取得

        Args:
            category: 価格カテゴリー

        Returns:
            List[Pricing]: 価格情報エンティティのリスト
        """
        pass

    @abstractmethod
    async def find_model_ids_by_category(self, category: PricingCategory) -> list[str]:
        """カテゴリーに属するモデルIDのリストを取得

        Args:
            category: 価格カテゴリー

        Returns:
            List[str]: モデルIDのリスト
        """
        pass

    @abstractmethod
    async def save(self, pricing: Pricing) -> Pricing:
        """価格情報を保存（新規作成または更新）

        Args:
            pricing: 価格情報エンティティ

        Returns:
            Pricing: 保存された価格情報エンティティ
        """
        pass

    @abstractmethod
    async def save_all(self, pricings: list[Pricing]) -> list[Pricing]:
        """複数の価格情報を一括保存

        Args:
            pricings: 価格情報エンティティのリスト

        Returns:
            List[Pricing]: 保存された価格情報エンティティのリスト
        """
        pass

    @abstractmethod
    async def delete(self, pricing: Pricing) -> None:
        """価格情報を削除

        Args:
            pricing: 価格情報エンティティ
        """
        pass

    async def get_pricing_dict(self) -> dict[str, Pricing]:
        """全モデルの価格情報を辞書形式で取得（便利メソッド）

        Returns:
            Dict[str, Pricing]: {model_id: Pricing} の辞書
        """
        pricings = await self.find_all()
        return {p.model_id: p for p in pricings}
