"""
@file balance_repository.py
@summary BalanceRepositoryインターフェース - 残高リポジトリ
@responsibility ユーザー残高のデータアクセスを抽象化
"""

from abc import ABC, abstractmethod

from ..entities.user_balance import UserBalance


class BalanceRepository(ABC):
    """残高リポジトリインターフェース

    UserBalanceエンティティのデータアクセスを抽象化する。
    具体的な実装（SQLAlchemy等）は Persistence 層で行う。
    """

    @abstractmethod
    async def find_by_user_and_model(
        self, user_id: str, model_id: str
    ) -> UserBalance | None:
        """ユーザーIDとモデルIDで残高を取得

        Args:
            user_id: ユーザーID
            model_id: モデルID

        Returns:
            Optional[UserBalance]: 残高エンティティ、存在しない場合はNone
        """
        pass

    @abstractmethod
    async def find_all_by_user(self, user_id: str) -> list[UserBalance]:
        """ユーザーIDで全モデルの残高を取得

        Args:
            user_id: ユーザーID

        Returns:
            List[UserBalance]: 残高エンティティのリスト
        """
        pass

    @abstractmethod
    async def find_by_user_and_models(
        self, user_id: str, model_ids: list[str]
    ) -> list[UserBalance]:
        """ユーザーIDと複数のモデルIDで残高を取得

        Args:
            user_id: ユーザーID
            model_ids: モデルIDのリスト

        Returns:
            List[UserBalance]: 残高エンティティのリスト
        """
        pass

    @abstractmethod
    async def save(self, balance: UserBalance) -> UserBalance:
        """残高を保存（新規作成または更新）

        Args:
            balance: 残高エンティティ

        Returns:
            UserBalance: 保存された残高エンティティ（idが設定される）
        """
        pass

    @abstractmethod
    async def delete(self, balance: UserBalance) -> None:
        """残高を削除

        Args:
            balance: 残高エンティティ
        """
        pass

    @abstractmethod
    async def delete_all_by_user(self, user_id: str) -> None:
        """ユーザーの全モデル残高を削除（デバッグ用）

        Args:
            user_id: ユーザーID
        """
        pass
