"""
@file credit_repository_impl.py
@summary CreditRepository実装 - CreditModelのCRUD操作
@responsibility SQLAlchemyを使用した未配分クレジットデータの永続化
"""


from sqlalchemy.orm import Session

from src.domain.billing.entities.credit import Credit
from src.domain.billing.repositories.credit_repository import CreditRepository
from src.persistence.models.billing import CreditModel


class CreditRepositoryImpl(CreditRepository):
    """クレジットリポジトリ実装

    SQLAlchemyを使用してCreditエンティティの永続化を行う。
    """

    def __init__(self, db: Session):
        """初期化

        Args:
            db: SQLAlchemyセッション
        """
        self.db = db

    async def find_by_user(self, user_id: str) -> Credit | None:
        """ユーザーのクレジット残高を取得

        Args:
            user_id: ユーザーID

        Returns:
            Credit: クレジットエンティティ、存在しない場合はNone
        """
        model = self.db.query(CreditModel).filter_by(user_id=user_id).first()

        if not model:
            return None

        return self._to_entity(model)

    async def save(self, credit: Credit) -> Credit:
        """クレジットを保存

        Args:
            credit: クレジットエンティティ

        Returns:
            Credit: 保存されたクレジットエンティティ
        """
        # 既存レコードを検索
        existing = self.db.query(CreditModel).filter_by(user_id=credit.user_id).first()

        if existing:
            # 更新
            existing.credits = credit.credits
            existing.updated_at = credit.updated_at
            self.db.flush()
            self.db.refresh(existing)
            return self._to_entity(existing)
        else:
            # 新規作成
            model = self._from_entity(credit)
            self.db.add(model)
            self.db.flush()
            self.db.refresh(model)
            return self._to_entity(model)

    async def delete(self, credit: Credit) -> None:
        """クレジットを削除

        Args:
            credit: クレジットエンティティ
        """
        self.db.query(CreditModel).filter_by(user_id=credit.user_id).delete()
        self.db.flush()

    async def delete_by_user(self, user_id: str) -> None:
        """ユーザーのクレジットを削除（デバッグ用）

        Args:
            user_id: ユーザーID
        """
        self.db.query(CreditModel).filter_by(user_id=user_id).delete()
        self.db.flush()

    async def create_or_update(self, user_id: str, credits: int) -> Credit:
        """クレジットを作成または更新（便利メソッド）

        Args:
            user_id: ユーザーID
            credits: クレジット額

        Returns:
            Credit: 保存されたクレジットエンティティ
        """
        credit_entity = Credit(user_id=user_id, credits=credits)
        return await self.save(credit_entity)

    # ========================================
    # 内部変換メソッド
    # ========================================

    def _to_entity(self, model: CreditModel) -> Credit:
        """ORMモデル → ドメインエンティティ変換

        Args:
            model: ORMモデル

        Returns:
            Credit: ドメインエンティティ
        """
        return Credit(
            user_id=model.user_id,  # type: ignore[arg-type]
            credits=model.credits,
            updated_at=model.updated_at,
        )

    def _from_entity(self, entity: Credit) -> CreditModel:
        """ドメインエンティティ → ORMモデル変換

        Args:
            entity: ドメインエンティティ

        Returns:
            CreditModel: ORMモデル
        """
        return CreditModel(
            user_id=entity.user_id,
            credits=entity.credits,
            updated_at=entity.updated_at,
        )
