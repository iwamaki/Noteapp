from langchain.tools import tool


@tool
def edit_file(title: str, content: str) -> str:
    """
    Edit file content in flat structure.

    This tool generates a command for frontend to edit a file.
    Actual file editing is executed on the frontend.

    Args:
        title: File name to edit (e.g., "Meeting Notes")
        content: New file content (full text)

    Returns:
        Message indicating the edit command was generated
    """
    return f"ファイル '{title}' の編集コマンドを生成しました。フロントエンドで編集が実行されます。"
