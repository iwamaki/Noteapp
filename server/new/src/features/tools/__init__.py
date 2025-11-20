"""
Features - Tools Package

LLMツール実装を集約します（新アーキテクチャ版）。

Note:
    これらのツールは新システム（main_new.py）で使用されます。
    旧システムのツール（src/llm/tools/）はそのまま保持されます。
"""

from langchain.tools import BaseTool

from src.features.tools.file_operations.read_file import read_file
from src.features.tools.search.search_files import search_files

# Note: 他のツール（edit_file, create_file等）は今後追加予定
# 現時点ではread_fileとsearch_filesのみ移行

# すべてのツールの辞書（ツール名とインスタンスのマッピング）
ALL_TOOLS: dict[str, BaseTool] = {
    "read_file": read_file,  # type: ignore
    "search_files": search_files,  # type: ignore
    # TODO: 他のツールを順次追加
    # "create_file": create_file,
    # "edit_file": edit_file,
    # "edit_file_lines": edit_file_lines,
    # "delete_file": delete_file,
    # "rename_file": rename_file,
    # "web_search": web_search,
    # "web_search_with_rag": web_search_with_rag,
    # "search_knowledge_base": search_knowledge_base,
}

# 新システムではデフォルトですべてのツールを有効化
# （将来的に設定ベースの有効/無効化を実装可能）
AVAILABLE_TOOLS: list[BaseTool] = list(ALL_TOOLS.values())

__all__ = [
    "read_file",
    "search_files",
    "ALL_TOOLS",
    "AVAILABLE_TOOLS",
]
