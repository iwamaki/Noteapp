from typing import Any

# グローバル変数でコンテキストを保持（Agentから設定される）
_current_file_context: dict[str, str | None] | None = None
_current_directory_context: dict[str, Any] | None = None
_all_files_context: list[dict[str, str]] | None = None
_current_client_id: str | None = None  # WebSocket接続のクライアントID

def set_file_context(context: dict[str, str | None] | dict[str, str] | None):
    """現在のファイルコンテキストを設定する"""
    global _current_file_context
    _current_file_context = context  # type: ignore[assignment]

def get_file_context() -> dict[str, str | None] | None:
    """現在のファイルコンテキストを取得する"""
    return _current_file_context

def set_directory_context(context: dict[str, Any] | None):
    """現在のディレクトリコンテキストを設定する"""
    global _current_directory_context
    _current_directory_context = context

def get_directory_context() -> dict[str, Any] | None:
    """現在のディレクトリコンテキストを取得する"""
    return _current_directory_context

def set_all_files_context(all_files: list[dict[str, str]] | None):
    """全ファイル情報を設定する"""
    global _all_files_context
    _all_files_context = all_files

def get_all_files_context() -> list[dict[str, str]] | None:
    """全ファイル情報を取得する"""
    return _all_files_context

def set_client_id(client_id: str | None):
    """現在のクライアントIDを設定する（WebSocket接続用）"""
    global _current_client_id
    _current_client_id = client_id

def get_client_id() -> str | None:
    """現在のクライアントIDを取得する（WebSocket接続用）"""
    return _current_client_id
