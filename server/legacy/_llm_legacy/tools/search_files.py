from typing import Literal

from langchain.tools import tool
from src.llm.tools.context_manager import get_client_id

from src.api.websocket import manager
from src.core.logger import logger


@tool
async def search_files(
    query: str,
    search_type: Literal["title", "content", "tag", "category"] = "title"
) -> str:
    """
    ファイルを検索します（WebSocket経由）。

    このツールは、指定されたクエリでファイルを検索します。
    検索タイプによって、タイトル、内容、タグ、カテゴリーで検索できます。

    動作フロー:
    1. WebSocket経由でフロントエンドに検索リクエストを送信
    2. フロントエンドはExpo FileSystemから全ファイルをスキャンして検索
    3. マッチしたファイルのリストを返す
    4. バックエンドは結果を整形してLLMに返す

    これにより、LLMがファイル横断的に情報を検索できます。

    Args:
        query: 検索クエリ（例: "会議", "TODO", "重要"）
        search_type: 検索タイプ
            - "title": ファイル名で検索（デフォルト）
            - "content": ファイル内容で検索
            - "tag": タグで検索
            - "category": カテゴリーで検索

    Returns:
        検索結果のリスト、またはエラーメッセージ
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
