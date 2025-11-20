"""
@file pricing_repository_impl.py
@summary PricingRepository実装 - PricingModelのCRUD操作
@responsibility SQLAlchemyを使用した価格情報データの永続化
"""


from sqlalchemy.orm import Session

from src.domain.billing.entities.pricing import Pricing, PricingCategory
from src.domain.billing.repositories.pricing_repository import PricingRepository
from src.persistence.models.billing import PricingModel


class PricingRepositoryImpl(PricingRepository):
    """価格情報リポジトリ実装

    SQLAlchemyを使用してPricingエンティティの永続化を行う。
    """

    def __init__(self, db: Session):
        """初期化

        Args:
            db: SQLAlchemyセッション
        """
        self.db = db

    async def find_by_model(self, model_id: str) -> Pricing | None:
        """モデルIDで価格情報を取得

        Args:
            model_id: モデルID

        Returns:
            Pricing: 価格情報エンティティ、存在しない場合はNone
        """
        model = self.db.query(PricingModel).filter_by(model_id=model_id).first()

        if not model:
            return None

        return self._to_entity(model)

    async def find_by_category(self, category: PricingCategory) -> list[Pricing]:
        """カテゴリー別の価格情報を取得

        Args:
            category: カテゴリー

        Returns:
            List[Pricing]: 価格情報エンティティのリスト
        """
        models = (
            self.db.query(PricingModel).filter_by(category=category.value).all()
        )

        return [self._to_entity(model) for model in models]

    async def find_model_ids_by_category(
        self, category: PricingCategory
    ) -> list[str]:
        """カテゴリー別のモデルIDリストを取得

        Args:
            category: カテゴリー

        Returns:
            List[str]: モデルIDのリスト
        """
        models = (
            self.db.query(PricingModel.model_id)
            .filter_by(category=category.value)
            .all()
        )

        return [model.model_id for model in models]

    async def find_all(self) -> list[Pricing]:
        """全ての価格情報を取得

        Returns:
            List[Pricing]: 価格情報エンティティのリスト
        """
        models = self.db.query(PricingModel).all()

        return [self._to_entity(model) for model in models]

    async def save(self, pricing: Pricing) -> Pricing:
        """価格情報を保存

        Args:
            pricing: 価格情報エンティティ

        Returns:
            Pricing: 保存された価格情報エンティティ
        """
        # 既存レコードを検索
        existing = (
            self.db.query(PricingModel).filter_by(model_id=pricing.model_id).first()
        )

        if existing:
            # 更新
            existing.price_per_m_token = pricing.price_per_m_token
            existing.category = pricing.category.value
            existing.exchange_rate = pricing.exchange_rate
            existing.margin_percent = pricing.margin_percent
            existing.updated_at = pricing.updated_at
            self.db.flush()
            self.db.refresh(existing)
            return self._to_entity(existing)
        else:
            # 新規作成
            model = self._from_entity(pricing)
            self.db.add(model)
            self.db.flush()
            self.db.refresh(model)
            return self._to_entity(model)

    async def save_all(self, pricings: list[Pricing]) -> list[Pricing]:
        """複数の価格情報を一括保存

        Args:
            pricings: 価格情報エンティティのリスト

        Returns:
            List[Pricing]: 保存された価格情報エンティティのリスト
        """
        saved_pricings = []

        for pricing in pricings:
            saved = await self.save(pricing)
            saved_pricings.append(saved)

        return saved_pricings

    async def delete(self, pricing: Pricing) -> None:
        """価格情報を削除

        Args:
            pricing: 価格情報エンティティ
        """
        self.db.query(PricingModel).filter_by(model_id=pricing.model_id).delete()
        self.db.flush()

    # ========================================
    # 内部変換メソッド
    # ========================================

    def _to_entity(self, model: PricingModel) -> Pricing:
        """ORMモデル → ドメインエンティティ変換

        Args:
            model: ORMモデル

        Returns:
            Pricing: ドメインエンティティ
        """
        return Pricing(
            model_id=model.model_id,
            price_per_m_token=model.price_per_m_token,
            category=PricingCategory(model.category),
            exchange_rate=model.exchange_rate,
            margin_percent=model.margin_percent,
            updated_at=model.updated_at,
        )

    def _from_entity(self, entity: Pricing) -> PricingModel:
        """ドメインエンティティ → ORMモデル変換

        Args:
            entity: ドメインエンティティ

        Returns:
            PricingModel: ORMモデル
        """
        return PricingModel(
            model_id=entity.model_id,
            price_per_m_token=entity.price_per_m_token,
            category=entity.category.value,
            exchange_rate=entity.exchange_rate,
            margin_percent=entity.margin_percent,
            updated_at=entity.updated_at,
        )
