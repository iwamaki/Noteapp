from langchain.tools import tool
from src.llm.tools.context_manager import get_file_context, get_all_files_context

@tool
def read_file(title: str) -> str:
    """
    指定されたファイルの内容を読み取ります（フラット構造）。

    このツールは、ファイル名（title）を指定してファイルの内容を取得します。
    現在開いているファイルの場合は、その内容を直接返します。
    それ以外の場合は、allFilesコンテキストから検索します。

    Args:
        title: 読み取るファイルの名前（例: "会議メモ", "新しいドキュメント"）

    Returns:
        ファイルの内容、またはファイルが見つからない場合はエラーメッセージ
    """
    # まず、現在開いているファイルかチェック
    current_file_context = get_file_context()
    if current_file_context:
        current_filename = current_file_context.get('filename') or ''
        current_content = current_file_context.get('content') or ''

        # ファイル名の比較
        if title.strip() == current_filename.strip():
            if current_content:
                return f"ファイル '{current_filename}' の内容:\n\n{current_content}"
            else:
                return f"ファイル '{current_filename}' は空です。"

    # allFilesコンテキストから検索
    all_files = get_all_files_context()
    if not all_files:
        return f"エラー: ファイルシステム情報が利用できません。ファイル '{title}' を読み取れません。"

    # titleで検索
    for file_info in all_files:
        if file_info.get('type') == 'file':
            file_title = file_info.get('title', '')

            # titleで一致するか確認
            if file_title == title.strip():
                # ファイルが見つかったが、内容は取得できない（AsyncStorageはフロントエンド側にある）
                categories = file_info.get('categories', [])
                tags = file_info.get('tags', [])
                info_parts = [f"ファイル '{file_title}' が見つかりました"]
                if categories:
                    info_parts.append(f"（カテゴリー: {', '.join(categories)}）")
                if tags:
                    info_parts.append(f"（タグ: {', '.join(tags)}）")

                return "".join(info_parts) + "が、内容を読み取るにはファイルを開いてから再度お試しください。\n\n現在開いているファイルのみ内容を読み取ることができます。"

    # ファイルが見つからない
    available_files = [f.get('title', '') for f in all_files if f.get('type') == 'file']
    return f"エラー: ファイル '{title}' が見つかりませんでした。\n\n利用可能なファイル:\n" + "\n".join(available_files[:10])
