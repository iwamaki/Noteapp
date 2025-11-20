"""
Vector Stores Infrastructure

FAISSベクトルストアの実装を提供します。
"""

from typing import Optional

from src.core.logger import logger

from ..document_processing.document_processor import DocumentProcessor
from .cleanup_job import start_cleanup_job, stop_cleanup_job
from .collection_manager import CollectionManager
from .faiss_vector_store import VectorStoreManager

# Singleton instances
_collection_manager: CollectionManager | None = None
_document_processor: DocumentProcessor | None = None


def get_collection_manager() -> CollectionManager:
    """Get singleton instance of CollectionManager

    Returns:
        CollectionManager instance
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
            f"(chunk_size={chunk_size}, chunk_overlap={chunk_overlap})"
        )
    return _document_processor


__all__ = [
    "VectorStoreManager",
    "CollectionManager",
    "DocumentProcessor",
    "start_cleanup_job",
    "stop_cleanup_job",
    "get_collection_manager",
    "get_document_processor",
]
