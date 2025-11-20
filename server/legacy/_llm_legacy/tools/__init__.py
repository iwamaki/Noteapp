from langchain.tools import BaseTool
from src.llm.providers.config import TOOLS_ENABLED

from .create_file import create_file
from .delete_file import delete_file
from .edit_file import edit_file
from .edit_file_lines import edit_file_lines
from .read_file import read_file
from .rename_file import rename_file
from .search_files import search_files
from .search_knowledge_base import search_knowledge_base
from .web_search import web_search
from .web_search_with_rag import web_search_with_rag

# すべてのツールの辞書（ツール名とインスタンスのマッピング）
ALL_TOOLS: dict[str, BaseTool] = {
    "create_file": create_file, # type: ignore
    "edit_file": edit_file, # type: ignore
    "edit_file_lines": edit_file_lines, # type: ignore
    "read_file": read_file, # type: ignore
    "delete_file": delete_file, # type: ignore
    "rename_file": rename_file, # type: ignore
    "search_files": search_files, # type: ignore
    "web_search": web_search, # type: ignore
    "web_search_with_rag": web_search_with_rag, # type: ignore
    "search_knowledge_base": search_knowledge_base, # type: ignore
}

def get_enabled_tools() -> list[BaseTool]:
    """config設定に基づいて有効なツールのリストを返す

    TOOLS_ENABLEDの設定でTrueになっているツールのみを返します。
    Falseに設定されたツールはLLMから認識されなくなります。

    Returns:
        有効なツールのリスト
    """
    enabled_tools: list[BaseTool] = []
    for tool_name, tool_instance in ALL_TOOLS.items():
        if TOOLS_ENABLED.get(tool_name, False):
            enabled_tools.append(tool_instance)
    return enabled_tools

# デフォルトで使用される有効なツールリスト
AVAILABLE_TOOLS: list[BaseTool] = get_enabled_tools()
