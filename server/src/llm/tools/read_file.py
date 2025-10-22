from langchain.tools import tool
from src.llm.tools.context_manager import get_file_context, get_all_files_context

@tool
def read_file(filename: str) -> str:
    """
    指定されたファイルの内容を読み取ります。

    このツールは、ファイル名またはパスを指定してファイルの内容を取得します。
    現在開いているファイルの場合は、その内容を直接返します。
    それ以外の場合は、allFilesコンテキストから検索します。

    Args:
        filename: 読み取るファイルのパスまたは名前（例: "/project/document.txt", "document.txt", "新しいドキュメント"）

    Returns:
        ファイルの内容、またはファイルが見つからない場合はエラーメッセージ
    """
    # まず、現在開いているファイルかチェック
    current_file_context = get_file_context()
    if current_file_context:
        current_filename = current_file_context.get('filename') or ''
        current_content = current_file_context.get('content') or ''

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
