from langchain.tools import tool
from src.llm.tools.context_manager import get_directory_context, get_all_files_context

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
