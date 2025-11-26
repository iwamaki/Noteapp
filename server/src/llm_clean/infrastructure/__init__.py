"""
Infrastructure Layer

外部システムとの実際の接続、具体的な実装を提供します。
Domain Interfaces と Application Ports を実装します。

Components:
- llm_providers: LLMプロバイダーの実装（Gemini, OpenAI）
- vector_stores: FAISSベクトルストアの実装
- document_processing: ドキュメント処理の実装
- token_counting: トークンカウンターの実装
"""

from .document_processing import DocumentProcessor
from .llm_providers import (
    PROVIDER_REGISTRY,
    BaseAgentLLMProvider,
    BaseLLMProvider,
    GeminiProvider,
    LLMClientFactory,
    OpenAIProvider,
    ProviderConfig,
    get_all_provider_names,
    get_model_metadata,
    get_provider_config,
)
from .token_counting import GeminiTokenCounter, TokenCounterFactory
from .vector_stores import (
    CollectionManager,
    PgVectorCleanupJob,
    PgVectorStore,
    PgVectorStoreAdapter,
    VectorStoreManager,
    get_pgvector_store,
    start_cleanup_job,
    start_pgvector_cleanup_job,
    stop_cleanup_job,
    stop_pgvector_cleanup_job,
)

__all__ = [
    # LLM Providers
    "BaseLLMProvider",
    "BaseAgentLLMProvider",
    "GeminiProvider",
    "OpenAIProvider",
    "LLMClientFactory",
    "ProviderConfig",
    "PROVIDER_REGISTRY",
    "get_provider_config",
    "get_all_provider_names",
    "get_model_metadata",

    # Token Counting
    "GeminiTokenCounter",
    "TokenCounterFactory",

    # Vector Stores (PostgreSQL/pgvector - 推奨)
    "PgVectorStore",
    "PgVectorStoreAdapter",
    "PgVectorCleanupJob",
    "get_pgvector_store",
    "start_pgvector_cleanup_job",
    "stop_pgvector_cleanup_job",

    # Vector Stores (FAISS - レガシー)
    "VectorStoreManager",
    "CollectionManager",
    "start_cleanup_job",
    "stop_cleanup_job",

    # Document Processing
    "DocumentProcessor",
]
