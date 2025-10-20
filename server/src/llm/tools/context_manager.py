from typing import Optional, Dict, List, Any, Union

# グローバル変数でコンテキストを保持（Agentから設定される）
_current_file_context: Optional[Dict[str, Optional[str]]] = None
_current_directory_context: Optional[Dict[str, Any]] = None
_all_files_context: Optional[List[Dict[str, str]]] = None

def set_file_context(context: Optional[Union[Dict[str, Optional[str]], Dict[str, str]]]):
    """現在のファイルコンテキストを設定する"""
    global _current_file_context
    _current_file_context = context  # type: ignore[assignment]

def get_file_context() -> Optional[Dict[str, Optional[str]]]:
    """現在のファイルコンテキストを取得する"""
    return _current_file_context

def set_directory_context(context: Optional[Dict[str, Any]]):
    """現在のディレクトリコンテキストを設定する"""
    global _current_directory_context
    _current_directory_context = context

def get_directory_context() -> Optional[Dict[str, Any]]:
    """現在のディレクトリコンテキストを取得する"""
    return _current_directory_context

def set_all_files_context(all_files: Optional[List[Dict[str, str]]]):
    """全ファイル情報を設定する"""
    global _all_files_context
    _all_files_context = all_files

def get_all_files_context() -> Optional[List[Dict[str, str]]]:
    """全ファイル情報を取得する"""
    return _all_files_context