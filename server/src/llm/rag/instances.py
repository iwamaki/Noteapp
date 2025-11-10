# @file instances.py
# @summary RAG関連のシングルトンインスタンス管理
# @responsibility CollectionManagerとDocumentProcessorのグローバルインスタンスを一元管理

from typing import Optional
from src.llm.rag.collection_manager import CollectionManager
from src.llm.rag.document_processor import DocumentProcessor
from src.core.logger import logger


# グローバルなインスタンス
_collection_manager: Optional[CollectionManager] = None
_document_processor: Optional[DocumentProcessor] = None


def get_collection_manager() -> CollectionManager:
    """コレクションマネージャーのシングルトンインスタンスを取得

    Returns:
        CollectionManager: コレクションマネージャーのインスタンス
    """
    global _collection_manager
    if _collection_manager is None:
        _collection_manager = CollectionManager()
        logger.info("CollectionManager singleton instance created")
    return _collection_manager


def get_document_processor(
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> DocumentProcessor:
    """ドキュメントプロセッサのシングルトンインスタンスを取得

    Args:
        chunk_size: チャンクサイズ（デフォルト: 1000）
        chunk_overlap: チャンクオーバーラップ（デフォルト: 200）

    Returns:
        DocumentProcessor: ドキュメントプロセッサのインスタンス
    """
    global _document_processor
    if _document_processor is None:
        _document_processor = DocumentProcessor(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        logger.info(
            f"DocumentProcessor singleton instance created "
            f"(chunk_size={chunk_size}, chunk_overlap={chunk_overlap})"
        )
    return _document_processor
