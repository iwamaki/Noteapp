"""
LLM Domain - Providers Package

LLMプロバイダーの実装を集約します。

主な責務: 各LLMプロバイダー（Gemini, OpenAI等）の
具体的な実装を提供します。
"""

from src.domain.llm.providers.base import BaseLLMProvider, BaseAgentLLMProvider
from src.domain.llm.providers.registry import (
    get_provider_config,
    get_all_provider_names,
    get_model_metadata,
    ModelMetadata,
    ProviderConfig
)
from src.domain.llm.providers.factory import LLMClientFactory
from src.domain.llm.providers.gemini_provider import GeminiProvider
from src.domain.llm.providers.openai_provider import OpenAIProvider
from src.domain.llm.providers.context_builder import ChatContextBuilder
from src.domain.llm.providers.command_extractor import AgentCommandExtractor

__all__ = [
    # Base classes
    "BaseLLMProvider",
    "BaseAgentLLMProvider",
    # Registry
    "get_provider_config",
    "get_all_provider_names",
    "get_model_metadata",
    "ModelMetadata",
    "ProviderConfig",
    # Factory
    "LLMClientFactory",
    # Providers
    "GeminiProvider",
    "OpenAIProvider",
    # Helpers
    "ChatContextBuilder",
    "AgentCommandExtractor",
]
