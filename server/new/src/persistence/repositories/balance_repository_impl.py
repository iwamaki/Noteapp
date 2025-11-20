"""
@file balance_repository_impl.py
@summary BalanceRepository実装 - UserBalanceModelのCRUD操作
@responsibility SQLAlchemyを使用したトークン残高データの永続化
"""


from sqlalchemy.orm import Session

from src.domain.billing.entities.user_balance import UserBalance
from src.domain.billing.repositories.balance_repository import BalanceRepository
from src.persistence.models.billing import UserBalanceModel


class BalanceRepositoryImpl(BalanceRepository):
    """トークン残高リポジトリ実装

    SQLAlchemyを使用してUserBalanceエンティティの永続化を行う。
    """

    def __init__(self, db: Session):
        """初期化

        Args:
            db: SQLAlchemyセッション
        """
        self.db = db

    async def find_by_user_and_model(
        self, user_id: str, model_id: str
    ) -> UserBalance | None:
        """ユーザー・モデル別の残高を取得

        Args:
            user_id: ユーザーID
            model_id: モデルID

        Returns:
            UserBalance: 残高エンティティ、存在しない場合はNone
        """
        model = (
            self.db.query(UserBalanceModel)
            .filter_by(user_id=user_id, model_id=model_id)
            .first()
        )

        if not model:
            return None

        return self._to_entity(model)

    async def find_all_by_user(self, user_id: str) -> list[UserBalance]:
        """ユーザーの全モデル残高を取得

        Args:
            user_id: ユーザーID

        Returns:
            List[UserBalance]: 残高エンティティのリスト
        """
        models = self.db.query(UserBalanceModel).filter_by(user_id=user_id).all()

        return [self._to_entity(model) for model in models]

    async def find_by_user_and_models(
        self, user_id: str, model_ids: list[str]
    ) -> list[UserBalance]:
        """ユーザー・複数モデルの残高を取得

        Args:
            user_id: ユーザーID
            model_ids: モデルIDのリスト

        Returns:
            List[UserBalance]: 残高エンティティのリスト
        """
        models = (
            self.db.query(UserBalanceModel)
            .filter(
                UserBalanceModel.user_id == user_id,
                UserBalanceModel.model_id.in_(model_ids),
            )
            .all()
        )

        return [self._to_entity(model) for model in models]

    async def save(self, balance: UserBalance) -> UserBalance:
        """残高を保存

        Args:
            balance: 残高エンティティ

        Returns:
            UserBalance: 保存された残高エンティティ
        """
        # 既存レコードを検索
        existing = (
            self.db.query(UserBalanceModel)
            .filter_by(user_id=balance.user_id, model_id=balance.model_id)
            .first()
        )

        if existing:
            # 更新
            existing.allocated_tokens = balance.allocated_tokens
            existing.updated_at = balance.updated_at
            self.db.flush()
            self.db.refresh(existing)
            return self._to_entity(existing)
        else:
            # 新規作成
            model = self._from_entity(balance)
            self.db.add(model)
            self.db.flush()
            self.db.refresh(model)
            return self._to_entity(model)

    async def delete(self, balance: UserBalance) -> None:
        """残高を削除

        Args:
            balance: 残高エンティティ
        """
        self.db.query(UserBalanceModel).filter_by(
            user_id=balance.user_id, model_id=balance.model_id
        ).delete()
        self.db.flush()

    async def delete_all_by_user(self, user_id: str) -> None:
        """ユーザーの全残高を削除（デバッグ用）

        Args:
            user_id: ユーザーID
        """
        self.db.query(UserBalanceModel).filter_by(user_id=user_id).delete()
        self.db.flush()

    # ========================================
    # 内部変換メソッド
    # ========================================

    def _to_entity(self, model: UserBalanceModel) -> UserBalance:
        """ORMモデル → ドメインエンティティ変換

        Args:
            model: ORMモデル

        Returns:
            UserBalance: ドメインエンティティ
        """
        return UserBalance(
            user_id=model.user_id,  # type: ignore[arg-type]
            model_id=model.model_id,
            allocated_tokens=model.allocated_tokens,
            updated_at=model.updated_at,
            id=model.id,
        )

    def _from_entity(self, entity: UserBalance) -> UserBalanceModel:
        """ドメインエンティティ → ORMモデル変換

        Args:
            entity: ドメインエンティティ

        Returns:
            UserBalanceModel: ORMモデル
        """
        return UserBalanceModel(
            id=entity.id,
            user_id=entity.user_id,
            model_id=entity.model_id,
            allocated_tokens=entity.allocated_tokens,
            updated_at=entity.updated_at,
        )
