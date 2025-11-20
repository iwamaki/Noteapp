"""LLM Provider Interface

Domain interface for LLM providers.
This defines the contract that all LLM provider implementations must follow.
"""
from abc import ABC, abstractmethod

from ..entities.llm_command import LLMCommand
from ..value_objects.chat_context import ChatContext
from ..value_objects.token_usage import TokenUsageInfo


class ChatResponse(ABC):
    """Chat response interface

    Represents the response from an LLM provider.
    """

    @abstractmethod
    def get_message(self) -> str:
        """Get the response message text"""
        pass

    @abstractmethod
    def get_commands(self) -> list[LLMCommand] | None:
        """Get extracted commands from the response"""
        pass

    @abstractmethod
    def get_token_usage(self) -> TokenUsageInfo | None:
        """Get token usage information"""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the provider name"""
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        """Get the model name used"""
        pass

    @abstractmethod
    def has_error(self) -> bool:
        """Check if the response contains an error"""
        pass

    @abstractmethod
    def get_error(self) -> str | None:
        """Get error message if any"""
        pass


class ILLMProvider(ABC):
    """LLM Provider interface

    Defines the contract for all LLM provider implementations.
    This is a port in the hexagonal architecture.

    All concrete implementations must implement these methods.
    """

    @abstractmethod
    async def chat(
        self,
        message: str,
        context: ChatContext | None = None,
        user_id: str | None = None,
        model_id: str | None = None
    ) -> ChatResponse:
        """Process a chat message and return a response

        Args:
            message: The user's message
            context: Optional chat context (files, history, etc.)
            user_id: Optional user ID for billing/auth
            model_id: Optional specific model ID to use

        Returns:
            ChatResponse containing the LLM's response

        Raises:
            LLMProviderError: If the provider encounters an error
            TokenBalanceError: If user has insufficient tokens
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the name of this provider

        Returns:
            Provider name (e.g., "gemini", "openai")
        """
        pass

    @abstractmethod
    def get_model_name(self) -> str:
        """Get the current model name

        Returns:
            Model name (e.g., "gemini-2.0-flash-exp", "gpt-4")
        """
        pass

    @abstractmethod
    def supports_streaming(self) -> bool:
        """Check if this provider supports streaming responses

        Returns:
            True if streaming is supported
        """
        pass

    @abstractmethod
    def get_max_context_length(self) -> int:
        """Get the maximum context length for this model

        Returns:
            Maximum number of tokens in context
        """
        pass
