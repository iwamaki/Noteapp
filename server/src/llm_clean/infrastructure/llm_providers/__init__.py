"""
LLM Providers Infrastructure

LLMプロバイダーの実装を提供します（Infrastructure Layer）。
Domain InterfacesとApplication Portsを実装し、具体的なLLM APIと通信します。
"""

from .base_provider import BaseAgentLLMProvider, BaseLLMProvider
from .gemini_provider import GeminiProvider
from .openai_provider import OpenAIProvider
from .provider_factory import LLMClientFactory
from .provider_registry import (
    PROVIDER_REGISTRY,
    ModelMetadata,
    ProviderConfig,
    get_all_provider_names,
    get_model_metadata,
    get_provider_config,
)

__all__ = [
    # Base classes
    "BaseLLMProvider",
    "BaseAgentLLMProvider",

    # Concrete providers
    "GeminiProvider",
    "OpenAIProvider",

    # Factory
    "LLMClientFactory",

    # Registry
    "ModelMetadata",
    "ProviderConfig",
    "PROVIDER_REGISTRY",
    "get_provider_config",
    "get_all_provider_names",
    "get_model_metadata",
]
