"""
@file transaction_repository.py
@summary TransactionRepositoryインターフェース - トランザクションリポジトリ
@responsibility 取引履歴のデータアクセスを抽象化
"""

from abc import ABC, abstractmethod

from ..entities.transaction import Transaction


class TransactionRepository(ABC):
    """トランザクションリポジトリインターフェース

    Transactionエンティティのデータアクセスを抽象化する。
    具体的な実装（SQLAlchemy等）は Persistence 層で行う。
    """

    @abstractmethod
    async def find_by_id(self, transaction_id: int) -> Transaction | None:
        """IDでトランザクションを取得

        Args:
            transaction_id: トランザクションID

        Returns:
            Optional[Transaction]: トランザクションエンティティ、存在しない場合はNone
        """
        pass

    @abstractmethod
    async def find_by_iap_transaction_id(
        self, iap_transaction_id: str
    ) -> Transaction | None:
        """IAP取引IDでトランザクションを取得（二重購入防止用）

        Args:
            iap_transaction_id: IAP取引ID

        Returns:
            Optional[Transaction]: トランザクションエンティティ、存在しない場合はNone
        """
        pass

    @abstractmethod
    async def find_by_user(
        self, user_id: str, limit: int = 100
    ) -> list[Transaction]:
        """ユーザーIDでトランザクション履歴を取得

        Args:
            user_id: ユーザーID
            limit: 取得する最大件数（デフォルト100）

        Returns:
            List[Transaction]: トランザクションエンティティのリスト（新しい順）
        """
        pass

    @abstractmethod
    async def save(self, transaction: Transaction) -> Transaction:
        """トランザクションを保存

        Args:
            transaction: トランザクションエンティティ

        Returns:
            Transaction: 保存されたトランザクションエンティティ（idが設定される）
        """
        pass

    @abstractmethod
    async def delete_all_by_user(self, user_id: str) -> None:
        """ユーザーの全トランザクション履歴を削除（デバッグ用）

        Args:
            user_id: ユーザーID
        """
        pass
