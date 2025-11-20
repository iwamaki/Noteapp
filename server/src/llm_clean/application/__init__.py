"""Application Layer

This module exports all application layer components:
- DTOs (Data Transfer Objects)
- Ports (Input and Output)
- Use Cases

The application layer orchestrates business logic without
depending on infrastructure details.
"""

# DTOs
from .dtos import (
    ChatContextDTO,
    ChatRequestDTO,
    ChatResponseDTO,
    LLMCommandDTO,
    LLMProviderDTO,
    ModelMetadataDTO,
    SearchRequestDTO,
    SearchResponseDTO,
    SummarizeRequestDTO,
    SummarizeResponseDTO,
    TokenUsageInfoDTO,
)

# Ports
from .ports import (
    BillingPort,
    DocumentProcessorPort,
    LLMProviderPort,
    VectorStorePort,
)

# Use Cases
from .use_cases import (
    GetProviderInfoUseCase,
    ProcessChatUseCase,
    SearchKnowledgeBaseUseCase,
    SummarizeConversationUseCase,
)

__all__ = [
    # Use Cases
    "ProcessChatUseCase",
    "SummarizeConversationUseCase",
    "SearchKnowledgeBaseUseCase",
    "GetProviderInfoUseCase",
    # Ports
    "LLMProviderPort",
    "VectorStorePort",
    "BillingPort",
    "DocumentProcessorPort",
    # DTOs
    "ChatRequestDTO",
    "ChatResponseDTO",
    "ChatContextDTO",
    "TokenUsageInfoDTO",
    "LLMCommandDTO",
    "SummarizeRequestDTO",
    "SummarizeResponseDTO",
    "LLMProviderDTO",
    "ModelMetadataDTO",
    "SearchRequestDTO",
    "SearchResponseDTO"
]
