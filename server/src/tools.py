"""
LLMツール定義
"""
from langchain.tools import tool
from typing import Optional


@tool
def edit_file(filename: str, content: str) -> str:
    """
    ファイルの内容を編集します。

    Args:
        filename: 編集するファイルのパス（例: "note.txt"）
        content: ファイルの新しい内容（全文）

    Returns:
        編集が成功したことを示すメッセージ
    """
    # 実際のファイル編集は行わず、フロントエンドに編集コマンドを返すためのツール
    # このツールが呼ばれたこと自体が、LLMがファイル編集を意図したことを示す
    return f"ファイル '{filename}' の編集コマンドを生成しました。"


# 利用可能なツールのリスト
AVAILABLE_TOOLS = [edit_file]
