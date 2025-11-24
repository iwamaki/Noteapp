from typing import Literal

from langchain.tools import tool

from src.api.websocket import manager
from src.core.logger import logger
from src.llm_clean.utils.tools.context_manager import get_client_id


@tool
async def search_files(
    query: str,
    search_type: Literal["title", "content", "tag", "category"] = "title"
) -> str:
    """
    Search files via WebSocket.

    This tool searches files by specified query.
    Search type determines whether to search by title, content, tag, or category.

    Workflow:
    1. Send search request to frontend via WebSocket
    2. Frontend scans all files from Expo FileSystem
    3. Return list of matching files
    4. Backend formats results and returns to LLM

    This allows LLM to search across files efficiently.

    Args:
        query: Search query (e.g., "meeting", "TODO", "important")
        search_type: Search type
            - "title": Search by file name (default)
            - "content": Search by file content
            - "tag": Search by tag
            - "category": Search by category

    Returns:
        List of search results, or error message
    """
    logger.info(f"search_files tool called: query={query}, search_type={search_type}")

    # WebSocket接続のクライアントIDを取得
    client_id = get_client_id()
    if not client_id:
        logger.error("No client_id available for WebSocket request")
        return "エラー: WebSocket接続が確立されていません。検索を実行できません。アプリを再起動してください。"

    try:
        logger.info(f"Requesting search via WebSocket: query={query}, search_type={search_type}, client_id={client_id}")

        # フロントエンドに検索リクエスト（30秒タイムアウト）
        results = await manager.request_search_results(
            client_id=client_id,
            query=query,
            search_type=search_type,
            timeout=30
        )

        if not results or len(results) == 0:
            return f"検索結果: クエリ '{query}' ({search_type}検索) に一致するファイルが見つかりませんでした。"

        # 結果を整形
        result_parts = [f"検索結果: クエリ '{query}' ({search_type}検索) で {len(results)}件のファイルが見つかりました。\n"]

        for i, file_info in enumerate(results[:20], 1):  # 最大20件まで表示
            title = file_info.get('title', '(タイトルなし)')
            category = file_info.get('category', '')
            tags = file_info.get('tags', [])

            result_parts.append(f"\n{i}. {title}")

            if category:
                result_parts.append(f" [カテゴリ: {category}]")

            if tags and len(tags) > 0:
                result_parts.append(f" [タグ: {', '.join(tags)}]")

            # content検索の場合、マッチした部分を表示
            if search_type == "content" and 'match_snippet' in file_info:
                snippet = file_info['match_snippet']
                result_parts.append(f"\n   マッチ: {snippet}")

        if len(results) > 20:
            result_parts.append(f"\n\n...他 {len(results) - 20}件")

        result_parts.append("\n\n特定のファイルの内容を読むには、read_file ツールを使用してください。")

        logger.info(f"Search completed: query={query}, results_count={len(results)}")
        return "".join(result_parts)

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error requesting search: query={query}, error={error_msg}")

        # エラーメッセージをユーザーフレンドリーに変換
        if "is not connected" in error_msg:
            return "エラー: サーバーとの接続が切断されています。検索を実行できません。\n\nアプリを再起動するか、しばらく待ってから再試行してください。"
        elif "タイムアウト" in error_msg or "Timeout" in error_msg:
            return "エラー: 検索がタイムアウトしました。ネットワーク接続を確認してください。"
        else:
            return f"エラー: 検索に失敗しました: {error_msg}"
