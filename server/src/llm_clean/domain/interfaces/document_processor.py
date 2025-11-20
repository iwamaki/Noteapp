"""Document Processor Interface

Domain interface for document processing.
This defines the contract for loading and processing documents for RAG.
"""
from abc import ABC, abstractmethod
from enum import Enum
from typing import Any


class DocumentType(str, Enum):
    """Supported document types"""
    PDF = "pdf"
    TEXT = "txt"
    MARKDOWN = "md"
    HTML = "html"
    DOCX = "docx"
    CSV = "csv"
    JSON = "json"
    UNKNOWN = "unknown"


class ProcessedDocument(ABC):
    """Processed document interface"""

    @abstractmethod
    def get_text(self) -> str:
        """Get the extracted text content"""
        pass

    @abstractmethod
    def get_metadata(self) -> dict[str, Any]:
        """Get document metadata"""
        pass

    @abstractmethod
    def get_chunks(self) -> list[str]:
        """Get text chunks (if chunked)"""
        pass

    @abstractmethod
    def get_document_type(self) -> DocumentType:
        """Get the document type"""
        pass


class IDocumentProcessor(ABC):
    """Document Processor interface

    Defines the contract for document processing implementations.
    Handles loading, parsing, and chunking documents for RAG.

    This is a port in the hexagonal architecture.
    """

    @abstractmethod
    async def load_document(
        self,
        file_path: str,
        document_type: DocumentType | None = None
    ) -> ProcessedDocument:
        """Load and process a document from file path

        Args:
            file_path: Path to the document file
            document_type: Optional document type hint

        Returns:
            ProcessedDocument with extracted content

        Raises:
            DocumentProcessingError: If loading fails
            UnsupportedDocumentTypeError: If document type is not supported
        """
        pass

    @abstractmethod
    async def load_from_bytes(
        self,
        file_bytes: bytes,
        filename: str,
        document_type: DocumentType | None = None
    ) -> ProcessedDocument:
        """Load and process a document from bytes

        Args:
            file_bytes: Document content as bytes
            filename: Original filename (for type detection)
            document_type: Optional document type hint

        Returns:
            ProcessedDocument with extracted content

        Raises:
            DocumentProcessingError: If loading fails
            UnsupportedDocumentTypeError: If document type is not supported
        """
        pass

    @abstractmethod
    async def chunk_text(
        self,
        text: str,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
        metadata: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """Split text into chunks

        Args:
            text: Text to chunk
            chunk_size: Maximum size of each chunk (in characters)
            chunk_overlap: Overlap between chunks (in characters)
            metadata: Optional metadata to attach to each chunk

        Returns:
            List of chunk dictionaries with 'text' and 'metadata' keys

        Raises:
            DocumentProcessingError: If chunking fails
        """
        pass

    @abstractmethod
    def detect_document_type(self, filename: str) -> DocumentType:
        """Detect document type from filename

        Args:
            filename: Name of the file

        Returns:
            Detected DocumentType
        """
        pass

    @abstractmethod
    def supports_document_type(self, document_type: DocumentType) -> bool:
        """Check if a document type is supported

        Args:
            document_type: The document type to check

        Returns:
            True if supported
        """
        pass

    @abstractmethod
    async def extract_metadata(
        self,
        file_path: str,
        document_type: DocumentType | None = None
    ) -> dict[str, Any]:
        """Extract metadata from a document without full processing

        Args:
            file_path: Path to the document file
            document_type: Optional document type hint

        Returns:
            Dictionary of metadata (author, title, creation_date, etc.)

        Raises:
            DocumentProcessingError: If metadata extraction fails
        """
        pass
