from langchain.tools import tool


@tool
def edit_file_lines(title: str, start_line: int, end_line: int, content: str) -> str:
    """
    Edit specific line range in a file (partial edit).

    Useful for editing part of large files without rewriting entire content, reducing token usage.

    This tool generates a command for frontend to edit file lines.
    Actual editing is executed on the frontend.

    Args:
        title: File name to edit (e.g., "Notes.txt")
        start_line: Start line number (1-based, inclusive)
        end_line: End line number (1-based, inclusive)
        content: New content (multiline string with \\n for line breaks)

    Returns:
        Message indicating the edit command was generated

    Examples:
        - Replace lines 3-5: edit_file_lines("Notes.txt", 3, 5, "new line 3\\nnew line 4\\nnew line 5")
        - Replace single line: edit_file_lines("Notes.txt", 10, 10, "new line 10")
        - Delete lines: edit_file_lines("Notes.txt", 3, 5, "")
    """
    line_count = end_line - start_line + 1
    return f"ファイル '{title}' の{start_line}行目から{end_line}行目（{line_count}行）を編集するコマンドを生成しました。フロントエンドで編集が実行されます。"
