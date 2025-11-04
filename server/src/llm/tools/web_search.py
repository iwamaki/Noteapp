from langchain.tools import tool
from src.core.logger import logger
import os
import httpx

@tool
async def web_search(
    query: str,
    max_results: int = 5
) -> str:
    """
    インターネット上の情報を検索します。

    このツールは、Google Custom Search APIを使用して指定されたクエリでWeb検索を実行し、
    最新の情報を取得します。

    使用例:
    - 最新のニュースや情報を取得したい場合
    - 技術的な問題の解決策を調べる場合
    - 一般的な知識や事実を確認する場合

    Args:
        query: 検索クエリ（例: "Python async/await 使い方", "最新のAIニュース"）
        max_results: 取得する検索結果の最大数（1-10、デフォルト: 5）

    Returns:
        検索結果のリスト、またはエラーメッセージ
    """
    logger.info(f"web_search tool called: query={query}, max_results={max_results}")

    # max_resultsの範囲チェック
    max_results = max(1, min(10, max_results))

    # Google Custom Search APIのキー確認
    api_key = os.getenv("GOOGLE_API_KEY")
    search_engine_id = os.getenv("GOOGLE_CSE_ID")

    if not api_key or not search_engine_id:
        error_msg = "Google Custom Search APIの設定が不足しています。"
        logger.error(f"Missing API credentials: api_key={bool(api_key)}, search_engine_id={bool(search_engine_id)}")
        return f"エラー: {error_msg}\n\n.envファイルに以下の環境変数を設定してください:\n- GOOGLE_API_KEY: Google API Key\n- GOOGLE_CSE_ID: Custom Search Engine ID"

    try:
        # Google Custom Search APIを使用
        async with httpx.AsyncClient(timeout=30.0) as client:
            url = "https://www.googleapis.com/customsearch/v1"
            params: dict[str, str | int] = {
                "key": api_key,
                "cx": search_engine_id,
                "q": query,
                "num": max_results,
                "lr": "lang_ja",  # 日本語の結果を優先
            }

            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

            if "items" not in data or len(data["items"]) == 0:
                return f"検索結果: クエリ '{query}' に一致する情報が見つかりませんでした。"

            return _format_google_results(query, data["items"], max_results)

    except httpx.HTTPStatusError as e:
        error_msg = f"HTTP {e.response.status_code}: {e.response.text}"
        logger.error(f"HTTP error in web_search: query={query}, error={error_msg}")

        if e.response.status_code == 429:
            return "エラー: 検索のレート制限に達しました。しばらく待ってから再試行してください。"
        elif e.response.status_code == 403:
            return "エラー: APIキーが無効か、権限がありません。設定を確認してください。"
        else:
            return f"エラー: Web検索に失敗しました (HTTP {e.response.status_code})"

    except httpx.TimeoutException:
        logger.error(f"Timeout in web_search: query={query}")
        return "エラー: 検索がタイムアウトしました。後でもう一度お試しください。"

    except httpx.RequestError as e:
        error_msg = str(e)
        logger.error(f"Network error in web_search: query={query}, error={error_msg}")
        return "エラー: ネットワーク接続に問題があります。インターネット接続を確認してください。"

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error in web_search: query={query}, error={error_msg}")
        return f"エラー: Web検索に失敗しました: {error_msg}"


def _format_google_results(query: str, results: list, max_results: int) -> str:
    """Google検索結果を整形する"""
    if not results or len(results) == 0:
        return f"検索結果: クエリ '{query}' に一致する情報が見つかりませんでした。"

    result_parts = [f"Web検索結果 (Google): '{query}' で {len(results)}件見つかりました。\n"]

    for i, result in enumerate(results[:max_results], 1):
        title = result.get('title', '(タイトルなし)')
        url = result.get('link', '')
        snippet = result.get('snippet', '')

        result_parts.append(f"\n{i}. {title}")

        if url:
            result_parts.append(f"\n   URL: {url}")

        if snippet:
            # 内容を200文字に制限
            snippet_text = snippet[:200] + "..." if len(snippet) > 200 else snippet
            result_parts.append(f"\n   概要: {snippet_text}")

    logger.info(f"Google search completed: query={query}, results_count={len(results)}")
    return "".join(result_parts)
