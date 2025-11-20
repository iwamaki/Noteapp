"""Summarization DTOs (Data Transfer Objects)

This module defines DTOs for conversation summarization use cases.
"""
from typing import Any, Literal

from pydantic import BaseModel


class SummarizeRequestDTO(BaseModel):
    """Summarization request DTO

    Used to request conversation history summarization.
    """
    conversationHistory: list[dict[str, Any]]  # Conversation history to summarize
    max_tokens: int = 4000  # Max tokens after compression
    preserve_recent: int = 10  # Number of recent messages to preserve
    provider: str  # LLM provider to use for summarization
    model: str | None = None  # Model to use (None = default)


class SummaryResultDTO(BaseModel):
    """Summary result DTO

    Represents the summarized conversation as a system message.
    """
    role: Literal["system"] = "system"
    content: str  # Summarized text
    timestamp: str | None = None


class SummarizeResponseDTO(BaseModel):
    """Summarization response DTO

    Contains the summary, preserved recent messages, and compression statistics.
    """
    summary: SummaryResultDTO  # Summarized system message
    recentMessages: list[dict[str, Any]]  # Preserved recent messages
    compressionRatio: float  # Compression ratio (0.0-1.0)
    originalTokens: int  # Original token count
    compressedTokens: int  # Compressed token count
    tokenUsage: dict[str, Any] | None = None  # Token usage info for billing
    model: str | None = None  # Model used for summarization


# Mapper functions

def summarize_request_dto_to_params(dto: SummarizeRequestDTO) -> dict[str, Any]:
    """Convert SummarizeRequestDTO to use case parameters

    Args:
        dto: SummarizeRequestDTO

    Returns:
        Dict with use case parameters
    """
    return {
        "conversation_history": dto.conversationHistory,
        "max_tokens": dto.max_tokens,
        "preserve_recent": dto.preserve_recent,
        "provider": dto.provider,
        "model": dto.model
    }
