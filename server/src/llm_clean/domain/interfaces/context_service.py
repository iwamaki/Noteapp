"""Context Service Interface

Domain interface for managing chat context.
This replaces global state with a proper service interface.
"""
from abc import ABC, abstractmethod
from typing import Any


class IContextService(ABC):
    """Context Service interface

    Defines the contract for context management.
    Replaces global variables with a thread-safe service.

    This is a port in the hexagonal architecture.
    """

    @abstractmethod
    def set_file_context(
        self,
        context: dict[str, str | None] | None,
        client_id: str | None = None
    ) -> None:
        """Set the current file context

        Args:
            context: File context dictionary (filename, content)
            client_id: Optional client ID for multi-user scenarios

        Raises:
            ContextServiceError: If setting fails
        """
        pass

    @abstractmethod
    def get_file_context(
        self,
        client_id: str | None = None
    ) -> dict[str, str | None] | None:
        """Get the current file context

        Args:
            client_id: Optional client ID for multi-user scenarios

        Returns:
            File context dictionary or None

        Raises:
            ContextServiceError: If getting fails
        """
        pass

    @abstractmethod
    def set_directory_context(
        self,
        context: dict[str, Any] | None,
        client_id: str | None = None
    ) -> None:
        """Set the current directory context

        Args:
            context: Directory context dictionary
            client_id: Optional client ID for multi-user scenarios

        Raises:
            ContextServiceError: If setting fails
        """
        pass

    @abstractmethod
    def get_directory_context(
        self,
        client_id: str | None = None
    ) -> dict[str, Any] | None:
        """Get the current directory context

        Args:
            client_id: Optional client ID for multi-user scenarios

        Returns:
            Directory context dictionary or None

        Raises:
            ContextServiceError: If getting fails
        """
        pass

    @abstractmethod
    def set_all_files_context(
        self,
        all_files: list[dict[str, str]] | None,
        client_id: str | None = None
    ) -> None:
        """Set all files context

        Args:
            all_files: List of all files
            client_id: Optional client ID for multi-user scenarios

        Raises:
            ContextServiceError: If setting fails
        """
        pass

    @abstractmethod
    def get_all_files_context(
        self,
        client_id: str | None = None
    ) -> list[dict[str, str]] | None:
        """Get all files context

        Args:
            client_id: Optional client ID for multi-user scenarios

        Returns:
            List of all files or None

        Raises:
            ContextServiceError: If getting fails
        """
        pass

    @abstractmethod
    def set_client_id(self, client_id: str | None) -> None:
        """Set the current client ID

        Args:
            client_id: WebSocket client ID

        Raises:
            ContextServiceError: If setting fails
        """
        pass

    @abstractmethod
    def get_client_id(self) -> str | None:
        """Get the current client ID

        Returns:
            Current client ID or None

        Raises:
            ContextServiceError: If getting fails
        """
        pass

    @abstractmethod
    def clear_context(self, client_id: str | None = None) -> None:
        """Clear all context for a client

        Args:
            client_id: Optional client ID (clears all if None)

        Raises:
            ContextServiceError: If clearing fails
        """
        pass

    @abstractmethod
    def has_context(self, client_id: str | None = None) -> bool:
        """Check if context exists for a client

        Args:
            client_id: Optional client ID

        Returns:
            True if context exists
        """
        pass
