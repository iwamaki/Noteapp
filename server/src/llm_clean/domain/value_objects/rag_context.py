# @file rag_context.py
# @summary RAG操作のコンテキスト情報を管理する値オブジェクト
# @responsibility user_id決定ロジックとコレクションタイプの判定を一元化します

from dataclasses import dataclass
from typing import Literal

CollectionType = Literal["temp", "persistent"]

# 認証機能追加まで使用するデフォルトユーザーID
# TODO: 認証機能追加後、この値は使用されなくなる予定
DEFAULT_USER_ID = "default_user"


@dataclass(frozen=True)
class RAGContext:
    """RAG操作のコンテキスト情報を保持する値オブジェクト

    Attributes:
        user_id: ユーザーID（tempコレクションの場合はNone）
        collection_type: コレクションタイプ（"temp" または "persistent"）
    """

    user_id: str | None
    collection_type: CollectionType

    @classmethod
    def from_collection_name(
        cls,
        collection_name: str,
        auth_user_id: str | None = None
    ) -> "RAGContext":
        """コレクション名からコンテキストを決定

        命名規則に基づいてコレクションタイプとuser_idを決定します。

        命名規則:
            - web_*, temp_* → temp (TTL付き、user_id不要)
            - category_*, default, その他 → persistent (永続、user_id必要)

        Args:
            collection_name: コレクション名
            auth_user_id: 認証されたユーザーID
                - 指定された場合: そのIDを使用
                - None の場合: DEFAULT_USER_ID を使用

        Returns:
            RAGContext インスタンス

        Examples:
            >>> RAGContext.from_collection_name("web_1234567890")
            RAGContext(user_id=None, collection_type='temp')

            >>> RAGContext.from_collection_name("default")
            RAGContext(user_id='default_user', collection_type='persistent')

            >>> RAGContext.from_collection_name("default", auth_user_id="user_123")
            RAGContext(user_id='user_123', collection_type='persistent')
        """
        if collection_name.startswith("web_") or collection_name.startswith("temp_"):
            return cls(user_id=None, collection_type="temp")

        return cls(
            user_id=auth_user_id or DEFAULT_USER_ID,
            collection_type="persistent"
        )

    @classmethod
    def for_temp_collection(cls) -> "RAGContext":
        """一時コレクション用のコンテキストを作成

        web_search_with_rag のような一時コレクション専用の処理で使用します。

        Returns:
            user_id=None, collection_type="temp" の RAGContext
        """
        return cls(user_id=None, collection_type="temp")
