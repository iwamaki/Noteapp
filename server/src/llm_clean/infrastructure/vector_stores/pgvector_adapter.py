# @file pgvector_adapter.py
# @summary VectorStorePortのPostgreSQL/pgvector実装
# @responsibility アプリケーション層からのベクトルストア操作をPgVectorStoreに委譲します

from typing import Any

from sqlalchemy.orm import Session

from src.core.logger import logger
from src.llm_clean.application.ports.output import VectorStorePort

from .pgvector_store import CollectionType, PgVectorStore


class PgVectorStoreAdapter(VectorStorePort):
    """VectorStorePortのPostgreSQL/pgvector実装

    アプリケーション層のVectorStorePortインターフェースを
    インフラストラクチャ層のPgVectorStoreに接続するアダプター。
    """

    def __init__(self, db: Session, user_id: str | None = None):
        """アダプターを初期化

        Args:
            db: SQLAlchemy Session
            user_id: ユーザーID（永続コレクション操作時に必要）
        """
        self.db = db
        self.user_id = user_id
        self._store = PgVectorStore(db)

        logger.debug(
            f"PgVectorStoreAdapter initialized: user_id={user_id}",
            extra={"category": "vectorstore"}
        )

    async def add_documents(
        self,
        collection_name: str,
        documents: list[str],
        metadatas: list[dict[str, Any]] | None = None
    ) -> int:
        """ドキュメントをコレクションに追加

        Args:
            collection_name: コレクション名
            documents: ドキュメントテキストのリスト
            metadatas: メタデータのリスト（オプション）

        Returns:
            追加されたドキュメント数
        """
        # コレクション名から種別を判定
        # web_ で始まる場合は temp、それ以外は persistent
        collection_type: CollectionType
        if collection_name.startswith("web_") or collection_name.startswith("temp_"):
            collection_type = "temp"
            user_id = None
        else:
            collection_type = "persistent"
            user_id = self.user_id

        return await self._store.add_documents(
            collection_name=collection_name,
            documents=documents,
            metadatas=metadatas,
            collection_type=collection_type,
            user_id=user_id
        )

    async def search(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5
    ) -> list[dict[str, Any]]:
        """類似度検索を実行

        Args:
            collection_name: コレクション名
            query: 検索クエリ
            top_k: 取得する結果の数

        Returns:
            検索結果のリスト
        """
        return await self._store.search(
            collection_name=collection_name,
            query=query,
            top_k=top_k,
            user_id=self.user_id
        )

    async def delete_collection(self, collection_name: str) -> bool:
        """コレクションを削除

        Args:
            collection_name: コレクション名

        Returns:
            削除成功の場合True
        """
        return await self._store.delete_collection(
            collection_name=collection_name,
            user_id=self.user_id
        )

    async def create_collection(
        self,
        collection_name: str,
        ttl_hours: int | None = None
    ) -> bool:
        """新しいコレクションを作成

        pgvectorではドキュメント追加時に暗黙的にコレクションが作成されるため、
        このメソッドは実質的にno-opですが、互換性のために存在します。

        Args:
            collection_name: コレクション名
            ttl_hours: TTL（時間単位）

        Returns:
            常にTrue
        """
        logger.info(
            f"Collection creation requested: {collection_name} (TTL: {ttl_hours}h)",
            extra={"category": "vectorstore"}
        )
        # pgvectorではドキュメント追加時に自動作成されるため、ここでは何もしない
        return True

    async def list_collections(self) -> list[dict[str, Any]]:
        """コレクション一覧を取得

        Returns:
            コレクション情報のリスト
        """
        return await self._store.list_collections(user_id=self.user_id)

    async def get_collection_info(self, collection_name: str) -> dict[str, Any] | None:
        """コレクション情報を取得

        Args:
            collection_name: コレクション名

        Returns:
            コレクション情報、存在しない場合はNone
        """
        return await self._store.get_collection_info(
            collection_name=collection_name,
            user_id=self.user_id
        )

    async def collection_exists(self, collection_name: str) -> bool:
        """コレクションが存在するか確認

        Args:
            collection_name: コレクション名

        Returns:
            存在する場合True
        """
        return await self._store.collection_exists(
            collection_name=collection_name,
            user_id=self.user_id
        )

    # 追加メソッド（ポートにはないがアダプター固有）

    async def cleanup_expired(self) -> int:
        """期限切れドキュメントを削除

        Returns:
            削除されたドキュメント数
        """
        return await self._store.cleanup_expired()

    def generate_temp_collection_name(self, prefix: str = "temp") -> str:
        """一時コレクション用のユニークな名前を生成

        Args:
            prefix: プレフィックス

        Returns:
            生成されたコレクション名
        """
        return self._store.generate_temp_collection_name(prefix)
