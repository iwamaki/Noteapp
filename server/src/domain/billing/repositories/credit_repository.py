"""
@file credit_repository.py
@summary CreditRepositoryインターフェース - クレジットリポジトリ
@responsibility 未配分クレジットのデータアクセスを抽象化
"""

from abc import ABC, abstractmethod

from ..entities.credit import Credit


class CreditRepository(ABC):
    """クレジットリポジトリインターフェース

    Creditエンティティのデータアクセスを抽象化する。
    具体的な実装（SQLAlchemy等）は Persistence 層で行う。
    """

    @abstractmethod
    async def find_by_user(self, user_id: str) -> Credit | None:
        """ユーザーIDでクレジットを取得

        Args:
            user_id: ユーザーID

        Returns:
            Optional[Credit]: クレジットエンティティ、存在しない場合はNone
        """
        pass

    @abstractmethod
    async def save(self, credit: Credit) -> Credit:
        """クレジットを保存（新規作成または更新）

        Args:
            credit: クレジットエンティティ

        Returns:
            Credit: 保存されたクレジットエンティティ
        """
        pass

    @abstractmethod
    async def delete(self, credit: Credit) -> None:
        """クレジットを削除

        Args:
            credit: クレジットエンティティ
        """
        pass

    @abstractmethod
    async def create_or_update(self, user_id: str, credits: int) -> Credit:
        """クレジットを作成または更新（便利メソッド）

        Args:
            user_id: ユーザーID
            credits: クレジット額

        Returns:
            Credit: 保存されたクレジットエンティティ
        """
        pass
