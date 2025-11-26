"""
Vector Stores Infrastructure

ベクトルストアの実装を提供します。
- PgVectorStore: PostgreSQL + pgvector
"""

from sqlalchemy.orm import Session

from src.core.logger import logger

from ..document_processing.document_processor import DocumentProcessor
from .pgvector_adapter import PgVectorStoreAdapter
from .pgvector_cleanup_job import (
    PgVectorCleanupJob,
    start_pgvector_cleanup_job,
    stop_pgvector_cleanup_job,
)
from .pgvector_store import PgVectorStore

# Singleton instances
_document_processor: DocumentProcessor | None = None


def get_document_processor(
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> DocumentProcessor:
    """Get singleton instance of DocumentProcessor

    Args:
        chunk_size: Chunk size (default: 1000)
        chunk_overlap: Chunk overlap (default: 200)

    Returns:
        DocumentProcessor instance
    """
    global _document_processor
    if _document_processor is None:
        _document_processor = DocumentProcessor(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        logger.info(
            f"DocumentProcessor singleton instance created "
            f"(chunk_size={chunk_size}, chunk_overlap={chunk_overlap})",
            extra={"category": "vectorstore"}
        )
    return _document_processor


def get_pgvector_store(db: Session, user_id: str | None = None) -> PgVectorStoreAdapter:
    """PgVectorStoreAdapterのインスタンスを取得

    Args:
        db: SQLAlchemy Session
        user_id: ユーザーID（永続コレクション操作時に必要）

    Returns:
        PgVectorStoreAdapter instance
    """
    return PgVectorStoreAdapter(db, user_id)


__all__ = [
    # PostgreSQL/pgvector
    "PgVectorStore",
    "PgVectorStoreAdapter",
    "PgVectorCleanupJob",
    "get_pgvector_store",
    "start_pgvector_cleanup_job",
    "stop_pgvector_cleanup_job",
    # 共通
    "DocumentProcessor",
    "get_document_processor",
]
