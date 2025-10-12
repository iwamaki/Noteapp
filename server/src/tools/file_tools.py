# @file file_tools.py
# @summary このファイルは、LLM（大規模言語モデル）が利用できるツールを定義します。
# @responsibility LLMが特定の操作（例: ファイル編集、ファイル読み込み）を実行する際に呼び出すことができる関数を提供し、
# そのツールの引数と戻り値を定義することで、LLMとシステム間のインタラクションを仲介します。
from langchain.tools import tool
from typing import Optional, Dict, List

# グローバル変数でコンテキストを保持（Agentから設定される）
_current_file_context: Optional[Dict[str, str]] = None
_current_directory_context: Optional[Dict[str, any]] = None


def set_file_context(context: Optional[Dict[str, str]]):
    """現在のファイルコンテキストを設定する"""
    global _current_file_context
    _current_file_context = context


def get_file_context() -> Optional[Dict[str, str]]:
    """現在のファイルコンテキストを取得する"""
    return _current_file_context


def set_directory_context(context: Optional[Dict[str, any]]):
    """現在のディレクトリコンテキストを設定する"""
    global _current_directory_context
    _current_directory_context = context


def get_directory_context() -> Optional[Dict[str, any]]:
    """現在のディレクトリコンテキストを取得する"""
    return _current_directory_context


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


@tool
def list_directory(path: str = "/") -> str:
    """
    指定されたディレクトリ内のファイルとフォルダのリストを取得します。

    このツールは、現在のディレクトリコンテキストから情報を取得します。

    Args:
        path: リスト表示するディレクトリのパス（デフォルト: "/"）

    Returns:
        ディレクトリ内のアイテムリスト、またはエラーメッセージ
    """
    dir_context = get_directory_context()

    if not dir_context:
        return "エラー: ディレクトリコンテキストが利用できません。"

    current_path = dir_context.get('currentPath', '/')
    file_list = dir_context.get('fileList', [])

    # パスが一致するか確認
    if path != current_path:
        return f"エラー: パス '{path}' は現在のディレクトリ '{current_path}' と一致しません。"

    if not file_list:
        return f"ディレクトリ '{current_path}' は空です。"

    # ファイルとフォルダを整形して返す
    result_lines = [f"ディレクトリ '{current_path}' の内容:"]
    for item in file_list:
        item_type = "📁" if item.get('type') == 'directory' else "📄"
        item_name = item.get('name', 'unknown')
        result_lines.append(f"{item_type} {item_name}")

    return "\n".join(result_lines)


@tool
def create_directory(name: str, path: str = "/") -> str:
    """
    新しいフォルダを作成します。

    このツールはフロントエンドでフォルダ作成を実行するためのコマンドを生成します。

    Args:
        name: 作成するフォルダの名前
        path: フォルダを作成する親ディレクトリのパス（デフォルト: "/"）

    Returns:
        フォルダ作成コマンドが生成されたことを示すメッセージ
    """
    return f"フォルダ '{name}' を '{path}' に作成するコマンドを生成しました。フロントエンドで作成が実行されます。"


@tool
def move_item(source_path: str, dest_path: str) -> str:
    """
    ファイルまたはフォルダを移動します。

    このツールはフロントエンドでアイテム移動を実行するためのコマンドを生成します。

    Args:
        source_path: 移動元のアイテムのフルパス
        dest_path: 移動先のディレクトリパス

    Returns:
        移動コマンドが生成されたことを示すメッセージ
    """
    return f"アイテム '{source_path}' を '{dest_path}' に移動するコマンドを生成しました。フロントエンドで移動が実行されます。"


@tool
def delete_item(path: str) -> str:
    """
    ファイルまたはフォルダを削除します。

    このツールはフロントエンドでアイテム削除を実行するためのコマンドを生成します。

    Args:
        path: 削除するアイテムのフルパス

    Returns:
        削除コマンドが生成されたことを示すメッセージ
    """
    return f"アイテム '{path}' を削除するコマンドを生成しました。フロントエンドで削除が実行されます。"


# 利用可能なツールのリスト
AVAILABLE_TOOLS = [
    edit_file,
    read_file,
    list_directory,
    create_directory,
    move_item,
    delete_item,
]
