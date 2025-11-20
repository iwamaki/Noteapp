"""
LLM Domain - ConversationRepository Interface

会話リポジトリのインターフェースを定義します。
会話の永続化・取得を抽象化し、Domain層とPersistence層を分離します。

責務:
- 会話の保存・取得・削除のインターフェース定義
- Domain層がPersistence層の実装詳細に依存しないようにする
"""

from abc import ABC, abstractmethod
from typing import Optional, List
from datetime import datetime

from src.domain.llm.entities.conversation import Conversation


class ConversationRepository(ABC):
    """
    会話リポジトリインターフェース

    会話の永続化・取得・削除を抽象化します。
    実装はPersistence層で行われます。
    """

    @abstractmethod
    async def save(self, conversation: Conversation) -> Conversation:
        """
        会話を保存（新規作成または更新）

        Args:
            conversation: 保存する会話エンティティ

        Returns:
            保存された会話エンティティ

        Raises:
            RepositoryError: 保存に失敗した場合
        """
        pass

    @abstractmethod
    async def find_by_id(self, conversation_id: str) -> Optional[Conversation]:
        """
        IDで会話を検索

        Args:
            conversation_id: 会話ID

        Returns:
            見つかった会話エンティティ、存在しない場合はNone

        Raises:
            RepositoryError: 検索に失敗した場合
        """
        pass

    @abstractmethod
    async def find_by_user_id(
        self,
        user_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[Conversation]:
        """
        ユーザーIDで会話を検索

        Args:
            user_id: ユーザーID
            limit: 取得する最大件数
            offset: オフセット

        Returns:
            会話エンティティのリスト

        Raises:
            RepositoryError: 検索に失敗した場合
        """
        pass

    @abstractmethod
    async def find_recent_by_user_id(
        self,
        user_id: str,
        days: int = 7,
        limit: int = 100
    ) -> List[Conversation]:
        """
        ユーザーIDで最近の会話を検索

        Args:
            user_id: ユーザーID
            days: 何日前までの会話を取得するか
            limit: 取得する最大件数

        Returns:
            会話エンティティのリスト

        Raises:
            RepositoryError: 検索に失敗した場合
        """
        pass

    @abstractmethod
    async def delete(self, conversation_id: str) -> bool:
        """
        会話を削除

        Args:
            conversation_id: 削除する会話のID

        Returns:
            削除に成功した場合True、存在しなかった場合False

        Raises:
            RepositoryError: 削除に失敗した場合
        """
        pass

    @abstractmethod
    async def delete_by_user_id(self, user_id: str) -> int:
        """
        ユーザーIDで会話を全て削除

        Args:
            user_id: ユーザーID

        Returns:
            削除された会話の数

        Raises:
            RepositoryError: 削除に失敗した場合
        """
        pass

    @abstractmethod
    async def exists(self, conversation_id: str) -> bool:
        """
        会話が存在するかチェック

        Args:
            conversation_id: 会話ID

        Returns:
            存在する場合True

        Raises:
            RepositoryError: チェックに失敗した場合
        """
        pass

    @abstractmethod
    async def count_by_user_id(self, user_id: str) -> int:
        """
        ユーザーの会話数を取得

        Args:
            user_id: ユーザーID

        Returns:
            会話の数

        Raises:
            RepositoryError: カウントに失敗した場合
        """
        pass
