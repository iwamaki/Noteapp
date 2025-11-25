from langchain.tools import tool


@tool
def rename_file(title: str, new_title: str) -> str:
    """
    Rename a file in flat structure.

    This tool generates a command for frontend to rename a file.
    Actual file renaming is executed on the frontend.

    Args:
        title: Current file name (e.g., "Old Name")
        new_title: New file name (e.g., "New Name")

    Returns:
        Message indicating the rename command was generated
    """
    return f"ファイル '{title}' を '{new_title}' に変更するコマンドを生成しました。フロントエンドで名前変更が実行されます。"
