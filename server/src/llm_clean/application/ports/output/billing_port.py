"""Billing Output Port

This port defines the interface for billing operations
used by application layer use cases.
"""
from abc import ABC, abstractmethod
from typing import Any


class BillingPort(ABC):
    """Output port for billing operations

    This port is used by use cases to interact with the billing system
    for token validation and consumption recording.
    """

    @abstractmethod
    def validate_token_balance(self, model_id: str, estimated_tokens: int) -> None:
        """Validate that user has sufficient token balance

        Args:
            model_id: Model ID (e.g., "gemini-2.5-flash")
            estimated_tokens: Estimated tokens needed for the operation

        Raises:
            ValueError: If token balance is insufficient
        """
        pass

    @abstractmethod
    def get_available_tokens(self, model_id: str) -> int:
        """Get available token balance for a model

        Args:
            model_id: Model ID

        Returns:
            Available token count
        """
        pass

    @abstractmethod
    def record_token_consumption(
        self,
        model_id: str,
        input_tokens: int,
        output_tokens: int,
        metadata: dict[str, Any]
    ) -> bool:
        """Record token consumption for billing

        Args:
            model_id: Model ID
            input_tokens: Input tokens consumed
            output_tokens: Output tokens consumed
            metadata: Additional metadata (e.g., operation type)

        Returns:
            True if successful
        """
        pass

    @abstractmethod
    def get_balance_summary(self) -> dict[str, Any]:
        """Get user's balance summary

        Returns:
            Dict containing credits, allocated tokens, etc.
        """
        pass

    @abstractmethod
    def check_balance_exists(self, model_id: str) -> bool:
        """Check if balance record exists for a model

        Args:
            model_id: Model ID

        Returns:
            True if balance record exists
        """
        pass
