"""Vector Store Interface

Domain interface for vector store implementations.
This defines the contract for RAG (Retrieval-Augmented Generation) storage.
"""
from abc import ABC, abstractmethod
from typing import Any


class Document(ABC):
    """Document interface for vector store"""

    @abstractmethod
    def get_content(self) -> str:
        """Get document content"""
        pass

    @abstractmethod
    def get_metadata(self) -> dict[str, Any]:
        """Get document metadata"""
        pass


class IVectorStore(ABC):
    """Vector Store interface

    Defines the contract for vector store implementations.
    Used for storing and retrieving document embeddings for RAG.

    This is a port in the hexagonal architecture.
    """

    @abstractmethod
    async def add_documents(
        self,
        documents: list[str],
        metadatas: list[dict[str, Any]] | None = None,
        collection_name: str = "default"
    ) -> list[str]:
        """Add documents to the vector store

        Args:
            documents: List of document texts
            metadatas: Optional list of metadata dicts for each document
            collection_name: Name of the collection to add to

        Returns:
            List of document IDs

        Raises:
            VectorStoreError: If adding documents fails
        """
        pass

    @abstractmethod
    async def search(
        self,
        query: str,
        collection_name: str = "default",
        top_k: int = 5,
        filter_metadata: dict[str, Any] | None = None
    ) -> list[tuple[Document, float]]:
        """Search for similar documents

        Args:
            query: Search query text
            collection_name: Name of the collection to search
            top_k: Number of results to return
            filter_metadata: Optional metadata filter

        Returns:
            List of (Document, similarity_score) tuples

        Raises:
            VectorStoreError: If search fails
        """
        pass

    @abstractmethod
    async def delete_documents(
        self,
        document_ids: list[str],
        collection_name: str = "default"
    ) -> None:
        """Delete documents from the vector store

        Args:
            document_ids: List of document IDs to delete
            collection_name: Name of the collection

        Raises:
            VectorStoreError: If deletion fails
        """
        pass

    @abstractmethod
    async def create_collection(
        self,
        collection_name: str,
        metadata: dict[str, Any] | None = None
    ) -> None:
        """Create a new collection

        Args:
            collection_name: Name of the collection to create
            metadata: Optional collection metadata

        Raises:
            VectorStoreError: If collection creation fails
        """
        pass

    @abstractmethod
    async def delete_collection(self, collection_name: str) -> None:
        """Delete a collection

        Args:
            collection_name: Name of the collection to delete

        Raises:
            VectorStoreError: If collection deletion fails
        """
        pass

    @abstractmethod
    async def list_collections(self) -> list[str]:
        """List all collections

        Returns:
            List of collection names

        Raises:
            VectorStoreError: If listing fails
        """
        pass

    @abstractmethod
    async def get_collection_stats(self, collection_name: str) -> dict[str, Any]:
        """Get statistics for a collection

        Args:
            collection_name: Name of the collection

        Returns:
            Dictionary with collection statistics (e.g., document_count, size)

        Raises:
            VectorStoreError: If collection doesn't exist
        """
        pass

    @abstractmethod
    async def collection_exists(self, collection_name: str) -> bool:
        """Check if a collection exists

        Args:
            collection_name: Name of the collection

        Returns:
            True if collection exists
        """
        pass
