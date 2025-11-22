"""LLM Provider Output Port

This port defines the interface for LLM provider operations
used by application layer use cases.

This is an abstraction of the domain ILLMProvider interface,
tailored for application layer needs.
"""
from abc import ABC, abstractmethod
from typing import Any


class LLMProviderPort(ABC):
    """Output port for LLM provider operations

    This port is used by use cases to interact with LLM providers
    without depending on concrete implementations.
    """

    @abstractmethod
    async def chat(
        self,
        message: str,
        context: Any | None = None,
        user_id: str | None = None,
        model: str | None = None,
        client_id: str | None = None
    ) -> dict[str, Any]:
        """Process a chat message

        Args:
            message: User message
            context: Chat context (Domain ChatContext)
            user_id: User ID for billing
            model: Model to use
            client_id: WebSocket client ID for tool operations

        Returns:
            Dict containing response message, commands, token usage, etc.
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Get provider name

        Returns:
            Provider name (e.g., "gemini", "openai")
        """
        pass

    @abstractmethod
    def get_available_models(self) -> list[str]:
        """Get list of available models

        Returns:
            List of model names
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available

        Returns:
            True if provider is configured and ready
        """
        pass
