# @file pgvector_store.py
# @summary PostgreSQL (pgvector) ベクトルストアの管理クラス
# @responsibility ベクトル化、保存、検索、TTL管理を行います

import json
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from pydantic import SecretStr
from sqlalchemy import delete, select, text
from sqlalchemy.orm import Session

from src.core.config import settings
from src.core.logger import logger
from src.data.models.vector_document import VectorDocument

CollectionType = Literal["temp", "persistent"]


class PgVectorStore:
    """PostgreSQL + pgvectorを使用したベクトルストア

    機能:
    - Gemini Embeddingを使用したドキュメントのベクトル化
    - pgvectorを使用した高速類似検索（HNSW）
    - 一時コレクション（TTL付き）と永続コレクション（ユーザー紐付け）の管理
    - マルチテナント対応（user_idによる分離）
    """

    # 埋め込みの次元数（Gemini embedding-001）
    EMBEDDING_DIMENSION = 768

    def __init__(self, db: Session):
        """ベクトルストアを初期化

        Args:
            db: SQLAlchemy Session
        """
        self.db = db
        self.embeddings = self._initialize_embeddings()

        logger.info(
            "PgVectorStore initialized",
            extra={"category": "vectorstore"}
        )

    def _initialize_embeddings(self) -> GoogleGenerativeAIEmbeddings:
        """Gemini Embeddingモデルを初期化

        Returns:
            GoogleGenerativeAIEmbeddings: 初期化されたEmbeddingモデル
        """
        api_key = settings.gemini_api_key
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY環境変数が設定されていません。"
                ".envファイルにGEMINI_API_KEYを設定してください。"
            )

        return GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=SecretStr(api_key)
        )

    async def add_documents(
        self,
        collection_name: str,
        documents: list[str],
        metadatas: list[dict[str, Any]] | None = None,
        collection_type: CollectionType = "temp",
        user_id: str | None = None,
        ttl_hours: float | None = 1.0
    ) -> int:
        """ドキュメントをベクトルストアに追加

        Args:
            collection_name: コレクション名
            documents: ドキュメントテキストのリスト
            metadatas: メタデータのリスト（オプション）
            collection_type: コレクションタイプ（'temp' or 'persistent'）
            user_id: ユーザーID（persistent時は必須）
            ttl_hours: TTL（時間単位）。temp時のみ有効

        Returns:
            追加されたドキュメント数

        Raises:
            ValueError: persistent時にuser_idがない場合
        """
        if not documents:
            logger.warning("No documents to add", extra={"category": "vectorstore"})
            return 0

        # persistent は user_id 必須
        if collection_type == "persistent" and not user_id:
            raise ValueError("persistent collection requires user_id")

        # 一時データはuser_id不要（明示的にNone）
        if collection_type == "temp":
            user_id = None

        # メタデータのデフォルト
        if metadatas is None:
            metadatas = [{}] * len(documents)

        # 埋め込みを生成
        logger.info(
            f"Generating embeddings for {len(documents)} documents",
            extra={"category": "vectorstore"}
        )
        embeddings = self.embeddings.embed_documents(documents)

        # 有効期限を計算
        expires_at = None
        if collection_type == "temp" and ttl_hours is not None:
            expires_at = datetime.now(UTC) + timedelta(hours=ttl_hours)

        # ドキュメントを保存（raw SQLでembeddingを含めてINSERT）
        added_count = 0
        for doc, embedding, metadata in zip(documents, embeddings, metadatas, strict=True):
            # embeddingはSQLAlchemyモデルで直接定義していないため、
            # raw SQLでINSERT（embeddingを含む）
            metadata_json = json.dumps(metadata) if metadata else "{}"

            self.db.execute(
                text("""
                    INSERT INTO vector_documents
                    (user_id, collection_name, collection_type, content, metadata, created_at, expires_at, embedding)
                    VALUES
                    (:user_id, :collection_name, :collection_type, :content, CAST(:metadata AS jsonb), NOW(), :expires_at, :embedding)
                """),
                {
                    "user_id": user_id,
                    "collection_name": collection_name,
                    "collection_type": collection_type,
                    "content": doc,
                    "metadata": metadata_json,
                    "expires_at": expires_at,
                    "embedding": str(embedding)
                }
            )
            added_count += 1

        self.db.commit()

        logger.info(
            f"Added {added_count} documents to collection '{collection_name}' "
            f"(type={collection_type}, user_id={user_id})",
            extra={"category": "vectorstore"}
        )

        return added_count

    async def search(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5,
        user_id: str | None = None
    ) -> list[dict[str, Any]]:
        """類似度検索を実行

        Args:
            collection_name: コレクション名
            query: 検索クエリ
            top_k: 取得する結果の数
            user_id: ユーザーID（persistentコレクション検索時に必要）

        Returns:
            検索結果のリスト（各要素は{content, metadata, score}の辞書）
        """
        # クエリの埋め込みを生成
        query_embedding = self.embeddings.embed_query(query)

        # 期限切れでないドキュメントを検索
        # cosine距離でソート（小さいほど類似）
        now = datetime.now(UTC)

        # Raw SQLで検索（pgvectorの<=>演算子使用）
        # 重要: クエリ埋め込みをvector型に明示的キャストする
        sql = text("""
            SELECT
                id,
                content,
                metadata,
                collection_type,
                user_id,
                embedding <=> CAST(:query_embedding AS vector) AS distance
            FROM vector_documents
            WHERE collection_name = :collection_name
              AND (expires_at IS NULL OR expires_at > :now)
              AND (
                  -- temp collection: user_id制限なし
                  (collection_type = 'temp')
                  OR
                  -- persistent collection: user_idが一致
                  (collection_type = 'persistent' AND user_id = :user_id)
              )
            ORDER BY distance
            LIMIT :top_k
        """)

        result = self.db.execute(
            sql,
            {
                "query_embedding": str(query_embedding),
                "collection_name": collection_name,
                "now": now,
                "user_id": user_id,
                "top_k": top_k
            }
        )

        # 結果を整形（距離を類似度に変換: similarity = 1 - distance）
        formatted_results = []
        for row in result:
            formatted_results.append({
                "content": row.content,
                "metadata": row.metadata or {},
                "score": 1.0 - float(row.distance)  # cosine距離 → 類似度
            })

        logger.info(
            f"Search completed: collection={collection_name}, "
            f"query='{query[:50]}...', results={len(formatted_results)}/{top_k}",
            extra={"category": "vectorstore"}
        )

        return formatted_results

    async def delete_collection(
        self,
        collection_name: str,
        user_id: str | None = None
    ) -> bool:
        """コレクションを削除

        Args:
            collection_name: コレクション名
            user_id: ユーザーID（persistentコレクションの場合は必須）

        Returns:
            削除成功の場合True
        """
        try:
            # temp: collection_name のみで削除
            # persistent: collection_name + user_id で削除
            stmt = delete(VectorDocument).where(
                VectorDocument.collection_name == collection_name
            )

            if user_id:
                stmt = stmt.where(VectorDocument.user_id == user_id)

            result = self.db.execute(stmt)
            self.db.commit()

            deleted_count = result.rowcount
            logger.info(
                f"Collection deleted: {collection_name} ({deleted_count} documents)",
                extra={"category": "vectorstore"}
            )
            return True

        except Exception as e:
            logger.error(
                f"Error deleting collection {collection_name}: {e}",
                extra={"category": "vectorstore"}
            )
            self.db.rollback()
            return False

    async def collection_exists(
        self,
        collection_name: str,
        user_id: str | None = None
    ) -> bool:
        """コレクションが存在するか確認

        Args:
            collection_name: コレクション名
            user_id: ユーザーID（オプション）

        Returns:
            存在する場合True
        """
        now = datetime.now(UTC)

        stmt = select(VectorDocument.id).where(
            VectorDocument.collection_name == collection_name
        ).where(
            (VectorDocument.expires_at == None) |  # noqa: E711
            (VectorDocument.expires_at > now)
        )

        if user_id:
            stmt = stmt.where(
                (VectorDocument.user_id == user_id) |
                (VectorDocument.collection_type == "temp")
            )

        result = self.db.execute(stmt.limit(1)).first()
        return result is not None

    async def get_collection_info(
        self,
        collection_name: str,
        user_id: str | None = None
    ) -> dict[str, Any] | None:
        """コレクション情報を取得

        Args:
            collection_name: コレクション名
            user_id: ユーザーID（オプション）

        Returns:
            コレクション情報、存在しない場合はNone
        """
        now = datetime.now(UTC)

        # ドキュメント数をカウント
        stmt = select(VectorDocument).where(
            VectorDocument.collection_name == collection_name
        ).where(
            (VectorDocument.expires_at == None) |  # noqa: E711
            (VectorDocument.expires_at > now)
        )

        if user_id:
            stmt = stmt.where(
                (VectorDocument.user_id == user_id) |
                (VectorDocument.collection_type == "temp")
            )

        docs = self.db.execute(stmt).scalars().all()

        if not docs:
            return None

        # 最初のドキュメントから情報を取得
        first_doc = docs[0]

        return {
            "collection_name": collection_name,
            "collection_type": first_doc.collection_type,
            "user_id": first_doc.user_id,
            "document_count": len(docs),
            "created_at": first_doc.created_at.isoformat() if first_doc.created_at else None,
            "expires_at": first_doc.expires_at.isoformat() if first_doc.expires_at else None
        }

    async def list_collections(
        self,
        user_id: str | None = None,
        collection_type: CollectionType | None = None
    ) -> list[dict[str, Any]]:
        """コレクション一覧を取得

        Args:
            user_id: ユーザーID（指定時はそのユーザーのコレクションのみ）
            collection_type: フィルタするコレクションタイプ

        Returns:
            コレクション情報のリスト
        """
        now = datetime.now(UTC)

        # DISTINCT collection_name でグループ化
        sql = text("""
            SELECT DISTINCT ON (collection_name)
                collection_name,
                collection_type,
                user_id,
                created_at,
                expires_at,
                COUNT(*) OVER (PARTITION BY collection_name) as document_count
            FROM vector_documents
            WHERE (expires_at IS NULL OR expires_at > :now)
              AND (:user_id IS NULL OR user_id = :user_id OR collection_type = 'temp')
              AND (:collection_type IS NULL OR collection_type = :collection_type)
            ORDER BY collection_name, created_at DESC
        """)

        result = self.db.execute(
            sql,
            {
                "now": now,
                "user_id": user_id,
                "collection_type": collection_type
            }
        )

        collections = []
        for row in result:
            collections.append({
                "collection_name": row.collection_name,
                "collection_type": row.collection_type,
                "user_id": row.user_id,
                "document_count": row.document_count,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "expires_at": row.expires_at.isoformat() if row.expires_at else None
            })

        return collections

    async def cleanup_expired(self) -> int:
        """期限切れドキュメントを削除

        Returns:
            削除されたドキュメント数
        """
        now = datetime.now(UTC)

        stmt = delete(VectorDocument).where(
            VectorDocument.expires_at != None,  # noqa: E711
            VectorDocument.expires_at < now
        )

        result = self.db.execute(stmt)
        self.db.commit()

        deleted_count = result.rowcount
        if deleted_count > 0:
            logger.info(
                f"Cleaned up {deleted_count} expired documents",
                extra={"category": "vectorstore"}
            )

        return deleted_count

    def generate_temp_collection_name(self, prefix: str = "temp") -> str:
        """一時コレクション用のユニークな名前を生成

        Args:
            prefix: プレフィックス（例: "web", "frontend"）

        Returns:
            生成されたコレクション名
        """
        timestamp = int(datetime.now(UTC).timestamp())
        return f"{prefix}_{timestamp}"
