"""
@file transaction_repository_impl.py
@summary TransactionRepository実装 - TransactionModelのCRUD操作
@responsibility SQLAlchemyを使用した取引履歴データの永続化
"""

import json

from sqlalchemy.orm import Session

from src.domain.billing.entities.transaction import Transaction, TransactionType
from src.domain.billing.repositories.transaction_repository import TransactionRepository
from src.persistence.models.billing import TransactionModel


class TransactionRepositoryImpl(TransactionRepository):
    """取引履歴リポジトリ実装

    SQLAlchemyを使用してTransactionエンティティの永続化を行う。
    """

    def __init__(self, db: Session):
        """初期化

        Args:
            db: SQLAlchemyセッション
        """
        self.db = db

    async def find_by_id(self, transaction_id: int) -> Transaction | None:
        """IDでトランザクションを取得

        Args:
            transaction_id: トランザクションID

        Returns:
            Optional[Transaction]: トランザクションエンティティ、存在しない場合はNone
        """
        model = self.db.query(TransactionModel).filter_by(id=transaction_id).first()

        if not model:
            return None

        return self._to_entity(model)

    async def find_by_iap_transaction_id(
        self, iap_transaction_id: str
    ) -> Transaction | None:
        """IAP取引IDで検索（二重購入チェック用）

        Args:
            iap_transaction_id: IAP取引ID

        Returns:
            Transaction: 取引エンティティ、存在しない場合はNone
        """
        model = (
            self.db.query(TransactionModel)
            .filter_by(transaction_id=iap_transaction_id)
            .first()
        )

        if not model:
            return None

        return self._to_entity(model)

    async def find_by_user(self, user_id: str, limit: int = 100) -> list[Transaction]:
        """ユーザーの取引履歴を取得

        Args:
            user_id: ユーザーID
            limit: 取得する最大件数（デフォルト100）

        Returns:
            List[Transaction]: 取引エンティティのリスト（新しい順）
        """
        models = (
            self.db.query(TransactionModel)
            .filter_by(user_id=user_id)
            .order_by(TransactionModel.created_at.desc())
            .limit(limit)
            .all()
        )

        return [self._to_entity(model) for model in models]

    async def save(self, transaction: Transaction) -> Transaction:
        """取引を保存

        Args:
            transaction: 取引エンティティ

        Returns:
            Transaction: 保存された取引エンティティ
        """
        model = self._from_entity(transaction)
        self.db.add(model)
        self.db.flush()
        self.db.refresh(model)
        return self._to_entity(model)

    async def delete_all_by_user(self, user_id: str) -> None:
        """ユーザーの全取引履歴を削除（デバッグ用）

        Args:
            user_id: ユーザーID
        """
        self.db.query(TransactionModel).filter_by(user_id=user_id).delete()
        self.db.flush()

    # ========================================
    # 内部変換メソッド
    # ========================================

    def _to_entity(self, model: TransactionModel) -> Transaction:
        """ORMモデル → ドメインエンティティ変換

        Args:
            model: ORMモデル

        Returns:
            Transaction: ドメインエンティティ
        """
        # JSON文字列をパース
        metadata = None
        if model.transaction_metadata:
            try:
                metadata = json.loads(model.transaction_metadata)
            except json.JSONDecodeError:
                metadata = None

        return Transaction(
            user_id=model.user_id,  # type: ignore[arg-type]
            type=TransactionType(model.type),
            amount=model.amount,
            model_id=model.model_id,
            transaction_id=model.transaction_id,
            transaction_metadata=metadata,
            created_at=model.created_at,
            id=model.id,
        )

    def _from_entity(self, entity: Transaction) -> TransactionModel:
        """ドメインエンティティ → ORMモデル変換

        Args:
            entity: ドメインエンティティ

        Returns:
            TransactionModel: ORMモデル
        """
        # メタデータをJSON文字列に変換
        metadata_str = None
        if entity.transaction_metadata:
            metadata_str = json.dumps(entity.transaction_metadata)

        return TransactionModel(
            id=entity.id,
            user_id=entity.user_id,
            type=entity.type.value,
            amount=entity.amount,
            model_id=entity.model_id,
            transaction_id=entity.transaction_id,
            transaction_metadata=metadata_str,
            created_at=entity.created_at,
        )
