"""Domain Interfaces

Interfaces (ports) that define contracts for infrastructure implementations.
These are part of the domain layer and must not depend on external frameworks.
"""
from .context_service import IContextService
from .document_processor import DocumentType, IDocumentProcessor, ProcessedDocument
from .llm_provider import ChatResponse, ILLMProvider
from .token_counter import ITokenCounter
from .vector_store import Document, IVectorStore

__all__ = [
    # LLM Provider
    "ILLMProvider",
    "ChatResponse",
    # Vector Store
    "IVectorStore",
    "Document",
    # Document Processor
    "IDocumentProcessor",
    "ProcessedDocument",
    "DocumentType",
    # Token Counter
    "ITokenCounter",
    # Context Service
    "IContextService",
]
