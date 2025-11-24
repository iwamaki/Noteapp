from langchain.tools import tool


@tool
def create_file(title: str, content: str = "", category: str = "", tags: str = "") -> str:
    """
    Create a new file in flat structure.

    This tool generates a command for frontend to create a file.
    Actual file creation is executed on the frontend.

    Args:
        title: File name to create (e.g., "Meeting Notes", "Ideas")
        content: Initial file content (optional)
        category: Category in hierarchical path format (e.g., "Work/Minutes", "Research/AI")
        tags: Comma-separated tags (e.g., "important,urgent")

    Returns:
        Message indicating the creation command was generated
    """
    msg_parts = [f"ファイル '{title}' を作成するコマンドを生成しました。"]

    if category:
        msg_parts.append(f"カテゴリー: {category}")
    if tags:
        msg_parts.append(f"タグ: {tags}")

    msg_parts.append("フロントエンドでファイル作成が実行されます。")

    return " ".join(msg_parts)
