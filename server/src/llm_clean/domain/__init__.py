"""Domain Layer

The domain layer contains the core business logic and is independent of
any external frameworks or infrastructure.

This layer follows Clean Architecture principles:
- No dependencies on outer layers
- Pure business logic
- Framework-independent
- Testable in isolation
"""

# Entities
from .entities import (
    ChatMessage,
    CommandAction,
    Conversation,
    LLMCommand,
)

# Interfaces (Ports)
from .interfaces import (
    ChatResponse,
    Document,
    DocumentType,
    IContextService,
    IDocumentProcessor,
    ILLMProvider,
    ITokenCounter,
    IVectorStore,
    ProcessedDocument,
)

# Domain Services
from .services import (
    CommandExtractorService,
    ContextService,
    get_context_service,
)

# Value Objects
from .value_objects import (
    ChatContext,
    CostInfo,
    EditScreenContext,
    FilelistScreenContext,
    ModelMetadata,
    PricingInfo,
    TokenUsageInfo,
)

__all__ = [
    # Entities
    "ChatMessage",
    "Conversation",
    "LLMCommand",
    "CommandAction",
    # Value Objects
    "TokenUsageInfo",
    "CostInfo",
    "PricingInfo",
    "ModelMetadata",
    "ChatContext",
    "FilelistScreenContext",
    "EditScreenContext",
    # Interfaces (Ports)
    "ILLMProvider",
    "ChatResponse",
    "IVectorStore",
    "Document",
    "IDocumentProcessor",
    "ProcessedDocument",
    "DocumentType",
    "ITokenCounter",
    "IContextService",
    # Domain Services
    "ContextService",
    "get_context_service",
    "CommandExtractorService",
]
