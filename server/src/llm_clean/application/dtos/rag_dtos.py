"""RAG (Retrieval-Augmented Generation) DTOs

This module defines DTOs for RAG-related use cases:
- Document upload
- Knowledge base search
- Collection management
"""
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class UploadDocumentRequestDTO(BaseModel):
    """Document upload request DTO"""
    collection_name: str
    file_content: str
    file_name: str
    metadata: dict[str, Any] | None = None


class UploadDocumentResponseDTO(BaseModel):
    """Document upload response DTO"""
    success: bool
    collection_name: str
    document_count: int
    message: str | None = None


class SearchRequestDTO(BaseModel):
    """Knowledge base search request DTO"""
    collection_name: str
    query: str
    top_k: int = 5


class SearchResultDTO(BaseModel):
    """Single search result DTO"""
    content: str
    metadata: dict[str, Any]
    score: float | None = None


class SearchResponseDTO(BaseModel):
    """Knowledge base search response DTO"""
    results: list[SearchResultDTO]
    collection_name: str
    query: str


class CollectionInfoDTO(BaseModel):
    """Collection information DTO"""
    name: str
    document_count: int
    created_at: datetime | None = None
    last_accessed: datetime | None = None
    ttl_hours: int | None = None


class CreateCollectionRequestDTO(BaseModel):
    """Create collection request DTO"""
    collection_name: str
    ttl_hours: int | None = None


class CreateCollectionResponseDTO(BaseModel):
    """Create collection response DTO"""
    success: bool
    collection_name: str
    message: str | None = None


class DeleteCollectionRequestDTO(BaseModel):
    """Delete collection request DTO"""
    collection_name: str


class DeleteCollectionResponseDTO(BaseModel):
    """Delete collection response DTO"""
    success: bool
    collection_name: str
    message: str | None = None


class ListCollectionsResponseDTO(BaseModel):
    """List collections response DTO"""
    collections: list[CollectionInfoDTO]
    total_count: int
