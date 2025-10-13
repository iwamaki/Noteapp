# @file file_tools.py
# @summary このファイルは、LLM（大規模言語モデル）が利用できるツールを定義します。
# @responsibility LLMが特定の操作（例: ファイル編集、ファイル読み込み）を実行する際に呼び出すことができる関数を提供し、
# そのツールの引数と戻り値を定義することで、LLMとシステム間のインタラクションを仲介します。
from langchain.tools import tool
from typing import Optional, Dict, List, Any
from difflib import get_close_matches

# グローバル変数でコンテキストを保持（Agentから設定される）
_current_file_context: Optional[Dict[str, str]] = None
_current_directory_context: Optional[Dict[str, Any]] = None
_all_files_context: Optional[List[Dict[str, str]]] = None


def set_file_context(context: Optional[Dict[str, str]]):
    """現在のファイルコンテキストを設定する"""
    global _current_file_context
    _current_file_context = context


def get_file_context() -> Optional[Dict[str, str]]:
    """現在のファイルコンテキストを取得する"""
    return _current_file_context


def set_directory_context(context: Optional[Dict[str, Any]]):
    """現在のディレクトリコンテキストを設定する"""
    global _current_directory_context
    _current_directory_context = context


def get_directory_context() -> Optional[Dict[str, Any]]:
    """現在のディレクトリコンテキストを取得する"""
    return _current_directory_context


def set_all_files_context(all_files: Optional[List[Dict[str, str]]]):
    """全ファイル情報を設定する"""
    global _all_files_context
    _all_files_context = all_files


def get_all_files_context() -> Optional[List[Dict[str, str]]]:
    """全ファイル情報を取得する"""
    return _all_files_context


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
    指定されたファイルの内容を読み取ります。

    このツールは、ファイル名またはパスを指定してファイルの内容を取得します。
    現在開いているファイルの場合は、その内容を直接返します。
    それ以外の場合は、allFilesコンテキストから検索します。

    Args:
        filename: 読み取るファイルのパスまたは名前（例: "/project/note.txt", "note.txt", "新しいノート"）

    Returns:
        ファイルの内容、またはファイルが見つからない場合はエラーメッセージ
    """
    # まず、現在開いているファイルかチェック
    current_file_context = get_file_context()
    if current_file_context:
        current_filename = current_file_context.get('filename', '')
        current_content = current_file_context.get('content', '')

        # ファイル名の比較（拡張子なしでも一致するように）
        filename_without_ext = filename.replace('.txt', '').replace('.md', '').strip('/')
        current_without_ext = current_filename.replace('.txt', '').replace('.md', '').strip('/')

        if filename_without_ext in current_without_ext or current_without_ext in filename_without_ext:
            if current_content:
                return f"ファイル '{current_filename}' の内容:\n\n{current_content}"
            else:
                return f"ファイル '{current_filename}' は空です。"

    # allFilesコンテキストから検索
    all_files = get_all_files_context()
    if not all_files:
        return f"エラー: ファイルシステム情報が利用できません。ファイル '{filename}' を読み取れません。"

    # パスまたはタイトルで検索
    normalized_filename = filename.strip('/')
    for file_info in all_files:
        if file_info.get('type') == 'file':
            file_path = file_info.get('path', '').strip('/')
            file_title = file_info.get('title', '')

            # パスまたはタイトルで一致するか確認
            if file_path == normalized_filename or file_title == normalized_filename:
                # ファイルが見つかったが、内容は取得できない（AsyncStorageはフロントエンド側にある）
                return f"ファイル '{file_title}' (パス: {file_path}) が見つかりましたが、内容を読み取るにはファイルを開いてから再度お試しください。\n\n現在開いているファイルのみ内容を読み取ることができます。"

    # ファイルが見つからない
    available_files = [f"{f.get('title')} ({f.get('path')})" for f in all_files if f.get('type') == 'file']
    return f"エラー: ファイル '{filename}' が見つかりませんでした。\n\n利用可能なファイル:\n" + "\n".join(available_files[:10])


@tool
def search_files(query: str) -> str:
    """
    ファイル名やタイトルに基づいてファイルを検索します。

    ファイル名が不確かな場合や、関連するファイルを探したい場合に使用します。
    検索クエリに最も一致する可能性の高いファイルのリストを返します。

    Args:
        query: 検索したいファイルに関するキーワード（例: "Aについて", "設定ファイル"）

    Returns:
        見つかったファイル候補のリスト、または見つからなかった場合はその旨を伝えるメッセージ
    """
    all_files = get_all_files_context()
    if not all_files:
        return "エラー: ファイルシステム情報が利用できません。"

    # 検索対象となるファイル名・タイトルのリストを作成
    file_titles = {f.get('title', ''): f.get('path', '') for f in all_files if f.get('type') == 'file'}
    
    # difflibを使って曖昧検索
    matches = get_close_matches(query, file_titles.keys(), n=5, cutoff=0.6)

    if not matches:
        # 部分文字列検索も試す
        partial_matches = [title for title in file_titles.keys() if query.lower() in title.lower()]
        if not partial_matches:
            return f"クエリ '{query}' に一致するファイルは見つかりませんでした。"
        matches = partial_matches[:5]


    if not matches:
        return f"クエリ '{query}' に一致するファイルは見つかりませんでした。"

    result_lines = [f"クエリ '{query}' に一致する可能性のあるファイル:"]
    for title in matches:
        path = file_titles[title]
        result_lines.append(f"- タイトル: {title} (パス: {path})")
    
    result_lines.append("\nこれらの情報を使って `read_file` ツールでファイルの内容を読み取ってください。")
    return "\n".join(result_lines)


@tool
def list_directory(path: str = "/") -> str:
    """
    指定されたディレクトリ内のファイルとフォルダのリストを取得します。

    このツールは、allFilesコンテキストから情報を取得し、
    指定されたパス配下のファイル・フォルダをリストアップします。

    Args:
        path: リスト表示するディレクトリのパス（デフォルト: "/"）

    Returns:
        ディレクトリ内のアイテムリスト、またはエラーメッセージ
    """
    # パスを正規化（末尾にスラッシュを追加）
    normalized_path = path if path.endswith('/') else f"{path}/"
    if normalized_path != '/' and not normalized_path.startswith('/'):
        normalized_path = f"/{normalized_path}"

    # まず現在のディレクトリコンテキストで一致するか確認
    dir_context = get_directory_context()
    if dir_context:
        current_path = dir_context.get('currentPath', '/')
        current_normalized = current_path if current_path.endswith('/') else f"{current_path}/"

        if normalized_path == current_normalized:
            file_list = dir_context.get('fileList', [])
            if not file_list:
                return f"ディレクトリ '{normalized_path}' は空です。"

            result_lines = [f"ディレクトリ '{normalized_path}' の内容:"]
            for item in file_list:
                item_type = "📁" if item.get('type') == 'directory' else "📄"
                item_name = item.get('name', 'unknown')
                result_lines.append(f"{item_type} {item_name}")

            return "\n".join(result_lines)

    # allFilesコンテキストから検索
    all_files = get_all_files_context()
    if not all_files:
        return "エラー: ファイルシステム情報が利用できません。"

    # 指定されたパス配下のアイテムをフィルタリング
    items_in_path = []
    for file_info in all_files:
        file_path = file_info.get('path', '')
        file_title = file_info.get('title', '')
        file_type = file_info.get('type', 'file')

        # パスから親ディレクトリを取得
        if file_path.endswith('/'):
            # ディレクトリの場合: /folder1/subfolder/ → /folder1/
            parts = file_path.rstrip('/').split('/')
            parent_path = '/'.join(parts[:-1]) + '/' if len(parts) > 1 else '/'
        else:
            # ファイルの場合（通常はこちら）
            parent_path = '/'.join(file_path.split('/')[:-1]) + '/'
            if parent_path == '/':
                parent_path = '/'

        # 指定されたパスと親パスが一致する場合のみリストに追加
        if parent_path == normalized_path:
            items_in_path.append({
                'name': file_title,
                'type': file_type,
                'path': file_path
            })

    if not items_in_path:
        return f"ディレクトリ '{normalized_path}' は空、または存在しません。"

    # 結果を整形
    result_lines = [f"ディレクトリ '{normalized_path}' の内容:"]
    # ディレクトリを先に、ファイルを後に
    directories = [item for item in items_in_path if item['type'] == 'directory']
    files = [item for item in items_in_path if item['type'] == 'file']

    for item in directories:
        result_lines.append(f"📁 {item['name']}/")
    for item in files:
        result_lines.append(f"📄 {item['name']}")

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
    search_files,
    list_directory,
    create_directory,
    move_item,
    delete_item,
]
