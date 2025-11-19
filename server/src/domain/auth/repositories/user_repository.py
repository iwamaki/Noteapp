"""
@file user_repository.py
@summary UserRepositoryインターフェース - ユーザーリポジトリ
@responsibility ユーザーのデータアクセスを抽象化
"""

from abc import ABC, abstractmethod

from ..entities.user import User


class UserRepository(ABC):
    """ユーザーリポジトリインターフェース

    Userエンティティのデータアクセスを抽象化する。
    具体的な実装（SQLAlchemy等）は Persistence 層で行う。
    """

    @abstractmethod
    async def find_by_id(self, user_id: str) -> User | None:
        """ユーザーIDでユーザーを取得

        Args:
            user_id: ユーザーID

        Returns:
            Optional[User]: ユーザーエンティティ、存在しない場合はNone
        """
        pass

    @abstractmethod
    async def find_by_google_id(self, google_id: str) -> User | None:
        """Google IDでユーザーを取得

        Args:
            google_id: Google ID

        Returns:
            Optional[User]: ユーザーエンティティ、存在しない場合はNone
        """
        pass

    @abstractmethod
    async def find_by_email(self, email: str) -> User | None:
        """メールアドレスでユーザーを取得

        Args:
            email: メールアドレス

        Returns:
            Optional[User]: ユーザーエンティティ、存在しない場合はNone
        """
        pass

    @abstractmethod
    async def exists_by_user_id(self, user_id: str) -> bool:
        """ユーザーIDでユーザーの存在をチェック

        Args:
            user_id: ユーザーID

        Returns:
            bool: 存在する場合True
        """
        pass

    @abstractmethod
    async def exists_by_google_id(self, google_id: str) -> bool:
        """Google IDでユーザーの存在をチェック

        Args:
            google_id: Google ID

        Returns:
            bool: 存在する場合True
        """
        pass

    @abstractmethod
    async def save(self, user: User) -> User:
        """ユーザーを保存（新規作成または更新）

        Args:
            user: ユーザーエンティティ

        Returns:
            User: 保存されたユーザーエンティティ（idが設定される）
        """
        pass

    @abstractmethod
    async def delete(self, user: User) -> None:
        """ユーザーを削除

        Args:
            user: ユーザーエンティティ
        """
        pass

    @abstractmethod
    async def count(self) -> int:
        """ユーザー総数を取得

        Returns:
            int: ユーザー総数
        """
        pass
