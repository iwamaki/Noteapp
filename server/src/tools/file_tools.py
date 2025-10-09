# @file tools.py
# @summary このファイルは、LLM（大規模言語モデル）が利用できるツールを定義します。
# 現在、ファイルの内容を編集するための`edit_file`ツールが含まれています。
# @responsibility LLMが特定の操作（例: ファイル編集）を実行する際に呼び出すことができる関数を提供し、
# そのツールの引数と戻り値を定義することで、LLMとシステム間のインタラクションを仲介します。
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


@tool
def read_file(filename: str) -> str:
    """
    ファイルの内容を読み取ります。

    Args:
        filename: 読み取るファイルのパス（例: "note.txt"）

    Returns:
        読み取りが必要であることを示すメッセージ
    """
    # 実際のファイル読み込みは行わず、フロントエンドに読み込みコマンドを返すためのツール
    # このツールが呼ばれたこと自体が、LLMがファイル読み込みを意図したことを示す
    return f"ファイル '{filename}' の読み取りコマンドを生成しました。"


# 利用可能なツールのリスト
AVAILABLE_TOOLS = [edit_file, read_file]
