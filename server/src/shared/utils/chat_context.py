"""
Shared Utils - Chat Context Manager

Request-scoped context management for chat operations.

This module manages context information for chat requests using module-level
global variables. This approach is acceptable for NoteApp because:
- Single-user application (mobile app with dedicated backend)
- Synchronous request processing (no concurrent chat requests)
- Request-scoped lifecycle (context set at start, consumed during request)

Originally from: src/llm/tools/context_manager.py
Moved to: src/shared/utils/chat_context.py (new architecture)
"""

from typing import Optional, Dict, List, Any, Union

# Request-scoped global variables
_current_file_context: Optional[Dict[str, Optional[str]]] = None
_current_directory_context: Optional[Dict[str, Any]] = None
_all_files_context: Optional[List[Dict[str, str]]] = None
_current_client_id: Optional[str] = None  # WebSocket client ID


def set_file_context(context: Optional[Union[Dict[str, Optional[str]], Dict[str, str]]]):
    """Set current file context

    Args:
        context: File context information
    """
    global _current_file_context
    _current_file_context = context  # type: ignore[assignment]


def get_file_context() -> Optional[Dict[str, Optional[str]]]:
    """Get current file context

    Returns:
        Current file context, or None
    """
    return _current_file_context


def set_directory_context(context: Optional[Dict[str, Any]]):
    """Set current directory context

    Args:
        context: Directory context information
    """
    global _current_directory_context
    _current_directory_context = context


def get_directory_context() -> Optional[Dict[str, Any]]:
    """Get current directory context

    Returns:
        Current directory context, or None
    """
    return _current_directory_context


def set_all_files_context(all_files: Optional[List[Dict[str, str]]]):
    """Set all files context

    Args:
        all_files: List of all file information
    """
    global _all_files_context
    _all_files_context = all_files


def get_all_files_context() -> Optional[List[Dict[str, str]]]:
    """Get all files context

    Returns:
        All files information, or None
    """
    return _all_files_context


def set_client_id(client_id: Optional[str]):
    """Set current WebSocket client ID

    Args:
        client_id: WebSocket client unique identifier
    """
    global _current_client_id
    _current_client_id = client_id


def get_client_id() -> Optional[str]:
    """Get current WebSocket client ID

    Returns:
        Client ID, or None
    """
    return _current_client_id
