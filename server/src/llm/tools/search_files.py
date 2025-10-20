from langchain.tools import tool
from difflib import get_close_matches
from src.llm.tools.context_manager import get_all_files_context

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
