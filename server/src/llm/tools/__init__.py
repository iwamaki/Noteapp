from langchain.tools import BaseTool
from .edit_file import edit_file
from .read_file import read_file
from .create_file import create_file
from .delete_file import delete_file
from .rename_file import rename_file

AVAILABLE_TOOLS: list[BaseTool] = [
    # フラット構造用ツール
    create_file, # type: ignore
    edit_file, # type: ignore
    read_file, # type: ignore
    delete_file, # type: ignore
    rename_file, # type: ignore
]
