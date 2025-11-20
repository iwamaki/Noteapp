"""Vector Store Output Port

This port defines the interface for vector store operations
used by application layer use cases.
"""
from abc import ABC, abstractmethod
from typing import Any


class VectorStorePort(ABC):
    """Output port for vector store operations

    This port is used by RAG use cases to interact with vector stores
    without depending on concrete implementations.
    """

    @abstractmethod
    async def add_documents(
        self,
        collection_name: str,
        documents: list[str],
        metadatas: list[dict[str, Any]] | None = None
    ) -> int:
        """Add documents to a collection

        Args:
            collection_name: Collection name
            documents: List of document texts
            metadatas: Optional list of metadata dicts

        Returns:
            Number of documents added
        """
        pass

    @abstractmethod
    async def search(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5
    ) -> list[dict[str, Any]]:
        """Search for similar documents

        Args:
            collection_name: Collection name
            query: Search query
            top_k: Number of results to return

        Returns:
            List of search results with content, metadata, and scores
        """
        pass

    @abstractmethod
    async def delete_collection(self, collection_name: str) -> bool:
        """Delete a collection

        Args:
            collection_name: Collection name

        Returns:
            True if successful
        """
        pass

    @abstractmethod
    async def create_collection(
        self,
        collection_name: str,
        ttl_hours: int | None = None
    ) -> bool:
        """Create a new collection

        Args:
            collection_name: Collection name
            ttl_hours: Time-to-live in hours (optional)

        Returns:
            True if successful
        """
        pass

    @abstractmethod
    async def list_collections(self) -> list[dict[str, Any]]:
        """List all collections

        Returns:
            List of collection info dicts
        """
        pass

    @abstractmethod
    async def get_collection_info(self, collection_name: str) -> dict[str, Any] | None:
        """Get collection information

        Args:
            collection_name: Collection name

        Returns:
            Collection info dict or None if not found
        """
        pass

    @abstractmethod
    async def collection_exists(self, collection_name: str) -> bool:
        """Check if collection exists

        Args:
            collection_name: Collection name

        Returns:
            True if collection exists
        """
        pass
