"""Document Processor Output Port

This port defines the interface for document processing operations
used by application layer use cases.
"""
from abc import ABC, abstractmethod
from typing import Any


class DocumentProcessorPort(ABC):
    """Output port for document processing operations

    This port is used by RAG use cases to process documents
    (loading, chunking, etc.) without depending on concrete implementations.
    """

    @abstractmethod
    async def load_document(
        self,
        file_content: str,
        file_name: str,
        metadata: dict[str, Any] | None = None
    ) -> list[str]:
        """Load and chunk a document

        Args:
            file_content: Document content
            file_name: File name (used to determine file type)
            metadata: Optional metadata to attach to chunks

        Returns:
            List of text chunks
        """
        pass

    @abstractmethod
    async def chunk_text(
        self,
        text: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ) -> list[str]:
        """Chunk text into smaller pieces

        Args:
            text: Text to chunk
            chunk_size: Maximum chunk size
            chunk_overlap: Overlap between chunks

        Returns:
            List of text chunks
        """
        pass

    @abstractmethod
    def get_supported_formats(self) -> list[str]:
        """Get list of supported file formats

        Returns:
            List of file extensions (e.g., [".txt", ".pdf", ".md"])
        """
        pass
