# @file vector_store.py
# @summary FAISSベクトルストアの管理クラス
# @responsibility ベクトル化、保存、検索、永続化を管理します

from pathlib import Path
from typing import Any

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from pydantic import SecretStr

from src.core.config import settings
from src.core.logger import logger


class VectorStoreManager:
    """FAISSベクトルストアを管理するクラス

    機能:
    - Gemini Embeddingを使用したドキュメントのベクトル化
    - FAISSを使用した高速類似検索
    - ベクトルストアの永続化（ディスクへの保存・読み込み）
    - スレッドセーフな操作
    """

    def __init__(
        self,
        storage_path: str | None = None,
        collection_name: str = "default"
    ):
        """ベクトルストアマネージャーを初期化

        Args:
            storage_path: ベクトルストアの保存先パス（Noneの場合はデフォルト）
            collection_name: コレクション名（異なる知識ベースを管理するため）
        """
        self.collection_name = collection_name

        # ストレージパスの設定
        if storage_path is None:
            # デフォルトパス: ./data/vector_stores/
            base_path = Path(__file__).parent.parent.parent.parent / "data" / "vector_stores"
            self.storage_path = base_path / collection_name
        else:
            self.storage_path = Path(storage_path)

        # ストレージディレクトリを作成
        self.storage_path.mkdir(parents=True, exist_ok=True)

        # Embeddingモデルの初期化
        self.embeddings = self._initialize_embeddings()

        # ベクトルストアの初期化
        self.vector_store: FAISS | None = None

        # 既存のベクトルストアを読み込み
        self._load_vector_store()

        logger.info(
            f"VectorStoreManager initialized: "
            f"collection={collection_name}, "
            f"storage_path={self.storage_path}"
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

        # Gemini Embedding API（embedding-001モデル）
        return GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=SecretStr(api_key)
        )

    def _load_vector_store(self) -> None:
        """保存されたベクトルストアを読み込む"""
        index_path = self.storage_path / "index.faiss"
        pkl_path = self.storage_path / "index.pkl"

        if index_path.exists() and pkl_path.exists():
            try:
                self.vector_store = FAISS.load_local(
                    str(self.storage_path),
                    self.embeddings,
                    allow_dangerous_deserialization=True
                )
                logger.info(f"Loaded existing vector store from {self.storage_path}")
            except Exception as e:
                logger.warning(f"Failed to load vector store: {e}")
                self.vector_store = None
        else:
            logger.info("No existing vector store found. Will create new one when documents are added.")

    def add_documents(
        self,
        documents: list[Document],
        save_after_add: bool = True
    ) -> None:
        """ドキュメントをベクトルストアに追加

        Args:
            documents: 追加するドキュメントのリスト
            save_after_add: 追加後に自動保存するかどうか
        """
        if not documents:
            logger.warning("No documents to add")
            return

        try:
            if self.vector_store is None:
                # 新規作成
                logger.info(f"Creating new vector store with {len(documents)} documents")
                self.vector_store = FAISS.from_documents(
                    documents,
                    self.embeddings
                )
            else:
                # 既存のストアに追加
                logger.info(f"Adding {len(documents)} documents to existing vector store")
                self.vector_store.add_documents(documents)

            if save_after_add:
                self.save()

            logger.info(f"Successfully added {len(documents)} documents")

        except Exception as e:
            logger.error(f"Error adding documents to vector store: {e}")
            raise

    def similarity_search(
        self,
        query: str,
        k: int = 4,
        score_threshold: float | None = None
    ) -> list[dict[str, Any]]:
        """類似度検索を実行

        Args:
            query: 検索クエリ
            k: 取得する結果の数
            score_threshold: スコアの閾値（Noneの場合は全て返す）

        Returns:
            検索結果のリスト（各要素は{content, metadata, score}の辞書）
        """
        if self.vector_store is None:
            logger.warning("Vector store is empty. No documents to search.")
            return []

        try:
            # スコア付き検索
            results = self.vector_store.similarity_search_with_score(query, k=k)

            # 結果を整形
            formatted_results = []
            for doc, score in results:
                # スコアの閾値チェック（小さいほど類似）
                if score_threshold is not None and score > score_threshold:
                    continue

                formatted_results.append({
                    "content": doc.page_content,
                    "metadata": doc.metadata,
                    "score": float(score)
                })

            logger.info(
                f"Similarity search completed: "
                f"query='{query[:50]}...', "
                f"results={len(formatted_results)}/{k}"
            )

            return formatted_results

        except Exception as e:
            logger.error(f"Error during similarity search: {e}")
            raise

    def save(self) -> None:
        """ベクトルストアをディスクに保存"""
        if self.vector_store is None:
            logger.warning("No vector store to save")
            return

        try:
            self.vector_store.save_local(str(self.storage_path))
            logger.info(f"Vector store saved to {self.storage_path}")
        except Exception as e:
            logger.error(f"Error saving vector store: {e}")
            raise

    def get_stats(self) -> dict[str, Any]:
        """ベクトルストアの統計情報を取得

        Returns:
            統計情報の辞書
        """
        if self.vector_store is None:
            return {
                "collection_name": self.collection_name,
                "document_count": 0,
                "storage_path": str(self.storage_path),
                "exists": False
            }

        # FAISSインデックスのドキュメント数を取得
        doc_count = self.vector_store.index.ntotal if hasattr(self.vector_store, 'index') else 0

        return {
            "collection_name": self.collection_name,
            "document_count": doc_count,
            "storage_path": str(self.storage_path),
            "exists": True
        }

    def clear(self) -> None:
        """ベクトルストアをクリア（メモリとディスク両方）"""
        self.vector_store = None

        # ディスクから削除
        index_path = self.storage_path / "index.faiss"
        pkl_path = self.storage_path / "index.pkl"

        try:
            if index_path.exists():
                index_path.unlink()
            if pkl_path.exists():
                pkl_path.unlink()
            logger.info(f"Vector store cleared: {self.collection_name}")
        except Exception as e:
            logger.error(f"Error clearing vector store: {e}")
            raise
