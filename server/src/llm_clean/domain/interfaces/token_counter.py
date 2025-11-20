"""Token Counter Interface

Domain interface for token counting.
This defines a provider-agnostic contract for counting tokens.
"""
from abc import ABC, abstractmethod
from typing import Any


class ITokenCounter(ABC):
    """Token Counter interface

    Defines the contract for token counting implementations.
    Each LLM provider may have different tokenization methods.

    This is a port in the hexagonal architecture.
    """

    @abstractmethod
    def count_tokens(self, text: str) -> int:
        """Count tokens in a text string

        Args:
            text: The text to count tokens for

        Returns:
            Number of tokens

        Raises:
            TokenCountError: If counting fails
        """
        pass

    @abstractmethod
    def count_message_tokens(
        self,
        messages: list[dict[str, Any]],
        model: str
    ) -> int:
        """Count tokens in a list of messages

        Args:
            messages: List of message dictionaries with 'role' and 'content'
            model: Model name (for provider-specific token counting)

        Returns:
            Total number of tokens

        Raises:
            TokenCountError: If counting fails
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Get the provider name this counter is for

        Returns:
            Provider name (e.g., "gemini", "openai")
        """
        pass

    @abstractmethod
    def get_max_context_length(self, model: str) -> int:
        """Get the maximum context length for a model

        Args:
            model: Model name

        Returns:
            Maximum context length in tokens
        """
        pass

    @abstractmethod
    def estimate_output_tokens(self, input_tokens: int) -> int:
        """Estimate output tokens based on input tokens

        This is a heuristic for billing estimation.

        Args:
            input_tokens: Number of input tokens

        Returns:
            Estimated output tokens
        """
        pass

    @abstractmethod
    def supports_model(self, model: str) -> bool:
        """Check if this counter supports a specific model

        Args:
            model: Model name

        Returns:
            True if supported
        """
        pass
