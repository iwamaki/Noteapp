"""Context Service Implementation

Thread-safe domain service for managing chat context.
Replaces global state with proper encapsulation.
"""
import threading
from typing import Any

from ..interfaces.context_service import IContextService


class ContextService(IContextService):
    """Context Service implementation

    Thread-safe service for managing chat context across clients.
    Uses a lock to ensure thread safety in concurrent scenarios.

    This is a domain service that implements the IContextService interface.
    """

    def __init__(self):
        """Initialize the context service with thread-safe storage"""
        self._lock = threading.RLock()  # Reentrant lock for nested calls

        # Storage per client_id
        self._file_contexts: dict[str, dict[str, str | None] | None] = {}
        self._directory_contexts: dict[str, dict[str, Any] | None] = {}
        self._all_files_contexts: dict[str, list[dict[str, str]] | None] = {}

        # Global current client ID (for backward compatibility)
        self._current_client_id: str | None = None

    def set_file_context(
        self,
        context: dict[str, str | None] | None,
        client_id: str | None = None
    ) -> None:
        """Set the current file context

        Args:
            context: File context dictionary (filename, content)
            client_id: Optional client ID for multi-user scenarios
        """
        with self._lock:
            key = client_id or self._current_client_id or "default"
            self._file_contexts[key] = context

    def get_file_context(
        self,
        client_id: str | None = None
    ) -> dict[str, str | None] | None:
        """Get the current file context

        Args:
            client_id: Optional client ID for multi-user scenarios

        Returns:
            File context dictionary or None
        """
        with self._lock:
            key = client_id or self._current_client_id or "default"
            return self._file_contexts.get(key)

    def set_directory_context(
        self,
        context: dict[str, Any] | None,
        client_id: str | None = None
    ) -> None:
        """Set the current directory context

        Args:
            context: Directory context dictionary
            client_id: Optional client ID for multi-user scenarios
        """
        with self._lock:
            key = client_id or self._current_client_id or "default"
            self._directory_contexts[key] = context

    def get_directory_context(
        self,
        client_id: str | None = None
    ) -> dict[str, Any] | None:
        """Get the current directory context

        Args:
            client_id: Optional client ID for multi-user scenarios

        Returns:
            Directory context dictionary or None
        """
        with self._lock:
            key = client_id or self._current_client_id or "default"
            return self._directory_contexts.get(key)

    def set_all_files_context(
        self,
        all_files: list[dict[str, str]] | None,
        client_id: str | None = None
    ) -> None:
        """Set all files context

        Args:
            all_files: List of all files
            client_id: Optional client ID for multi-user scenarios
        """
        with self._lock:
            key = client_id or self._current_client_id or "default"
            self._all_files_contexts[key] = all_files

    def get_all_files_context(
        self,
        client_id: str | None = None
    ) -> list[dict[str, str]] | None:
        """Get all files context

        Args:
            client_id: Optional client ID for multi-user scenarios

        Returns:
            List of all files or None
        """
        with self._lock:
            key = client_id or self._current_client_id or "default"
            return self._all_files_contexts.get(key)

    def set_client_id(self, client_id: str | None) -> None:
        """Set the current client ID

        Args:
            client_id: WebSocket client ID
        """
        with self._lock:
            self._current_client_id = client_id

    def get_client_id(self) -> str | None:
        """Get the current client ID

        Returns:
            Current client ID or None
        """
        with self._lock:
            return self._current_client_id

    def clear_context(self, client_id: str | None = None) -> None:
        """Clear all context for a client

        Args:
            client_id: Optional client ID (clears all if None)
        """
        with self._lock:
            if client_id:
                # Clear specific client
                self._file_contexts.pop(client_id, None)
                self._directory_contexts.pop(client_id, None)
                self._all_files_contexts.pop(client_id, None)
            else:
                # Clear all contexts
                self._file_contexts.clear()
                self._directory_contexts.clear()
                self._all_files_contexts.clear()
                self._current_client_id = None

    def has_context(self, client_id: str | None = None) -> bool:
        """Check if context exists for a client

        Args:
            client_id: Optional client ID

        Returns:
            True if context exists
        """
        with self._lock:
            key = client_id or self._current_client_id or "default"
            return (
                key in self._file_contexts
                or key in self._directory_contexts
                or key in self._all_files_contexts
            )

    def get_all_client_ids(self) -> list[str]:
        """Get all client IDs with active context

        Returns:
            List of client IDs
        """
        with self._lock:
            all_keys: set[str] = set()
            all_keys.update(self._file_contexts.keys())
            all_keys.update(self._directory_contexts.keys())
            all_keys.update(self._all_files_contexts.keys())
            return list(all_keys)


# Singleton instance (for backward compatibility during migration)
_global_context_service: ContextService | None = None


def get_context_service() -> ContextService:
    """Get the global context service instance

    Returns:
        ContextService singleton instance
    """
    global _global_context_service
    if _global_context_service is None:
        _global_context_service = ContextService()
    return _global_context_service
