from langchain.tools import tool


@tool
def delete_file(title: str) -> str:
    """
    Delete a file in flat structure.

    This tool generates a command for frontend to delete a file.
    Actual file deletion is executed on the frontend.

    Args:
        title: File name to delete (e.g., "Old Notes")

    Returns:
        Message indicating the deletion command was generated
    """
    return f"ファイル '{title}' を削除するコマンドを生成しました。フロントエンドで削除が実行されます。"
