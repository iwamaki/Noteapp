"""LLM Clean Architecture Module

This module implements the LLM functionality using Clean Architecture principles.

Architecture layers:
- Domain: Core business logic (entities, value objects, interfaces, services)
- Application: Use cases and DTOs for orchestrating business logic
- Infrastructure: External integrations (LLM providers, vector stores, etc.)
- Presentation: API routers and schemas (thin HTTP layer)
- Utils: Utilities and tools

Current Status: Phase 3 Complete ✅
- ✅ Phase 1: Domain layer fully implemented
- ✅ Phase 2: Application layer fully implemented
- ✅ Phase 3: Infrastructure & Presentation layers fully implemented
  - LLM Providers (Gemini, OpenAI)
  - RAG Module (Vector Stores, Document Processing)
  - Tools (File operations, Search, Web)
  - All Routers (Chat, Provider, Knowledge Base)
  - Middleware (Error Handling)
- Dependency Injection configured and integrated
"""

# Re-export domain layer for convenience
# Re-export application layer for convenience
from .application import *  # noqa: F401, F403
from .domain import *  # noqa: F401, F403

# Re-export infrastructure layer for convenience
from .infrastructure import *  # noqa: F401, F403

# Re-export presentation layer for convenience
from .presentation import *  # noqa: F401, F403

# Re-export utils for convenience
from .utils import *  # noqa: F401, F403

__version__ = "1.0.0-phase3"
