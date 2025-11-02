from typing import Literal
from langchain.tools import tool
from src.core.logger import logger

@tool
async def web_search(
    query: str,
    search_engine: Literal["duckduckgo", "tavily"] = "duckduckgo",
    max_results: int = 5
) -> str:
    """
    インターネット上の情報を検索します。

    このツールは、指定されたクエリでWeb検索を実行し、最新の情報を取得します。
    DuckDuckGoまたはTavilyの検索エンジンを使用できます。

    使用例:
    - 最新のニュースや情報を取得したい場合
    - 技術的な問題の解決策を調べる場合
    - 一般的な知識や事実を確認する場合

    Args:
        query: 検索クエリ（例: "Python async/await 使い方", "最新のAIニュース"）
        search_engine: 使用する検索エンジン
            - "duckduckgo": DuckDuckGo検索（デフォルト、無料）
            - "tavily": Tavily検索（より高精度、API KEY必要）
        max_results: 取得する検索結果の最大数（1-10、デフォルト: 5）

    Returns:
        検索結果のリスト、またはエラーメッセージ
    """
    logger.info(f"web_search tool called: query={query}, search_engine={search_engine}, max_results={max_results}")

    # max_resultsの範囲チェック
    max_results = max(1, min(10, max_results))

    try:
        if search_engine == "tavily":
            from langchain_community.tools.tavily_search import TavilySearchResults
            import os

            # Tavily API Keyの確認
            tavily_api_key = os.getenv("TAVILY_API_KEY")
            if not tavily_api_key:
                logger.warning("TAVILY_API_KEY not found, falling back to DuckDuckGo")
                search_engine = "duckduckgo"
            else:
                tavily_tool = TavilySearchResults(
                    max_results=max_results,
                    search_depth="advanced",
                    include_answer=True,
                    include_raw_content=False,
                    include_images=False,
                )
                results = await tavily_tool.ainvoke({"query": query})
                return _format_tavily_results(query, results, max_results)

        # DuckDuckGoを使用
        from langchain_community.tools import DuckDuckGoSearchResults
        from langchain_community.utilities import DuckDuckGoSearchAPIWrapper

        wrapper = DuckDuckGoSearchAPIWrapper(
            max_results=max_results,
            region="jp-jp",
            time="y",  # 過去1年以内の結果
            safesearch="moderate"
        )

        search_tool = DuckDuckGoSearchResults(
            api_wrapper=wrapper,
            output_format="list"
        )

        results = await search_tool.ainvoke({"query": query})
        return _format_duckduckgo_results(query, results, max_results)

    except ImportError as e:
        error_msg = f"必要なライブラリがインストールされていません: {str(e)}"
        logger.error(f"Import error in web_search: {error_msg}")
        return f"エラー: {error_msg}\n\n以下のコマンドで必要なライブラリをインストールしてください:\npip install duckduckgo-search langchain-community"

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error in web_search: query={query}, error={error_msg}")

        # エラーメッセージをユーザーフレンドリーに変換
        if "rate limit" in error_msg.lower():
            return "エラー: 検索のレート制限に達しました。しばらく待ってから再試行してください。"
        elif "network" in error_msg.lower() or "connection" in error_msg.lower():
            return "エラー: ネットワーク接続に問題があります。インターネット接続を確認してください。"
        elif "timeout" in error_msg.lower():
            return "エラー: 検索がタイムアウトしました。後でもう一度お試しください。"
        else:
            return f"エラー: Web検索に失敗しました: {error_msg}"


def _format_tavily_results(query: str, results: list, max_results: int) -> str:
    """Tavily検索結果を整形する"""
    if not results or len(results) == 0:
        return f"検索結果: クエリ '{query}' に一致する情報が見つかりませんでした。"

    result_parts = [f"Web検索結果 (Tavily): '{query}' で {len(results)}件見つかりました。\n"]

    for i, result in enumerate(results[:max_results], 1):
        title = result.get('title', '(タイトルなし)')
        url = result.get('url', '')
        content = result.get('content', result.get('snippet', ''))

        result_parts.append(f"\n{i}. {title}")

        if url:
            result_parts.append(f"\n   URL: {url}")

        if content:
            # 内容を200文字に制限
            snippet = content[:200] + "..." if len(content) > 200 else content
            result_parts.append(f"\n   概要: {snippet}")

    logger.info(f"Tavily search completed: query={query}, results_count={len(results)}")
    return "".join(result_parts)


def _format_duckduckgo_results(query: str, results: list, max_results: int) -> str:
    """DuckDuckGo検索結果を整形する"""
    if not results or len(results) == 0:
        return f"検索結果: クエリ '{query}' に一致する情報が見つかりませんでした。"

    result_parts = [f"Web検索結果 (DuckDuckGo): '{query}' で {len(results)}件見つかりました。\n"]

    for i, result in enumerate(results[:max_results], 1):
        # resultsがdict形式の場合とstring形式の場合に対応
        if isinstance(result, dict):
            title = result.get('title', '(タイトルなし)')
            url = result.get('link', result.get('url', ''))
            snippet = result.get('snippet', result.get('body', ''))
        else:
            # string形式の場合はそのまま表示
            result_parts.append(f"\n{i}. {result}")
            continue

        result_parts.append(f"\n{i}. {title}")

        if url:
            result_parts.append(f"\n   URL: {url}")

        if snippet:
            # 内容を200文字に制限
            snippet_text = snippet[:200] + "..." if len(snippet) > 200 else snippet
            result_parts.append(f"\n   概要: {snippet_text}")

    logger.info(f"DuckDuckGo search completed: query={query}, results_count={len(results)}")
    return "".join(result_parts)
