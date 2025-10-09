# @file file_tools.py
# @summary このファイルは、LLM（大規模言語モデル）が利用できるツールを定義します。
# @responsibility LLMが特定の操作（例: ファイル編集、ファイル読み込み）を実行する際に呼び出すことができる関数を提供し、
# そのツールの引数と戻り値を定義することで、LLMとシステム間のインタラクションを仲介します。
from langchain.tools import tool
from typing import Optional, Dict

# グローバル変数でコンテキストを保持（Agentから設定される）
_current_file_context: Optional[Dict[str, str]] = None


def set_file_context(context: Optional[Dict[str, str]]):
    """現在のファイルコンテキストを設定する"""
    global _current_file_context
    _current_file_context = context


def get_file_context() -> Optional[Dict[str, str]]:
    """現在のファイルコンテキストを取得する"""
    return _current_file_context


@tool
def edit_file(filename: str, content: str) -> str:
    """
    ファイルの内容を編集します。

    このツールはフロントエンドでファイル編集を実行するためのコマンドを生成します。
    実際のファイル編集はフロントエンドで行われます。

    Args:
        filename: 編集するファイルのパス（例: "note.txt"）
        content: ファイルの新しい内容（全文）

    Returns:
        編集コマンドが生成されたことを示すメッセージ
    """
    return f"ファイル '{filename}' の編集コマンドを生成しました。フロントエンドで編集が実行されます。"


@tool
def read_file(filename: str) -> str:
    """
    現在開いているファイルの内容を読み取ります。

    このツールは、ユーザーが現在編集しているファイルの内容を取得します。
    ファイル名が現在のファイルと一致する場合、その内容を返します。

    Args:
        filename: 読み取るファイルのパス（例: "note.txt", "新しいノート"）

    Returns:
        ファイルの内容、またはファイルが見つからない場合はエラーメッセージ
    """
    context = get_file_context()

    if not context:
        return "エラー: 現在開いているファイルの情報がありません。"

    current_filename = context.get('filename', '')
    current_content = context.get('content', '')

    # ファイル名の比較（拡張子なしでも一致するように）
    filename_without_ext = filename.replace('.txt', '').replace('.md', '')
    current_without_ext = current_filename.replace('.txt', '').replace('.md', '')

    if filename_without_ext in current_without_ext or current_without_ext in filename_without_ext:
        if current_content:
            return f"ファイル '{current_filename}' の内容:\n\n{current_content}"
        else:
            return f"ファイル '{current_filename}' は空です。"
    else:
        return f"エラー: ファイル '{filename}' は現在開かれていません。現在開いているファイル: '{current_filename}'"


# 利用可能なツールのリスト
AVAILABLE_TOOLS = [edit_file, read_file]
