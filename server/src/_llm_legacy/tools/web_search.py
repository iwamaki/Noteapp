from langchain.tools import tool
from src.core.logger import logger
from src.core.config import settings
import os
import httpx
from bs4 import BeautifulSoup  # type: ignore
from typing import Optional
import asyncio

@tool
async def web_search(
    query: str,
    max_results: int = 5,
    fetch_details: int = 3
) -> str:
    """
    インターネット上の情報を検索し、詳細な内容を取得します。

    このツールは、Google Custom Search APIを使用して指定されたクエリでWeb検索を実行し、
    上位結果のページ内容も取得することで、より深い情報を提供します。

    使用例:
    - 最新のニュースや情報を取得したい場合
    - 技術的な問題の解決策を調べる場合
    - 一般的な知識や事実を確認する場合
    - 深い情報や詳細な説明が必要な場合

    Args:
        query: 検索クエリ（例: "Python async/await 使い方", "最新のAIニュース"）
        max_results: 取得する検索結果の最大数（1-10、デフォルト: 5）
        fetch_details: ページ内容を取得する上位結果の数（0-5、デフォルト: 3）
                      0に設定すると、スニペットのみを返します

    Returns:
        検索結果と詳細内容、またはエラーメッセージ
    """
    logger.info(f"web_search tool called: query={query}, max_results={max_results}, fetch_details={fetch_details}")

    # パラメータの範囲チェック
    max_results = max(1, min(10, max_results))
    fetch_details = max(0, min(5, fetch_details))

    # Google Custom Search APIのキー確認
    # Secret Managerから取得したAPIキーを使用
    api_key = settings.google_cse_api_key
    search_engine_id = os.getenv("GOOGLE_CSE_ID")

    if not api_key or not search_engine_id:
        error_msg = "Google Custom Search APIの設定が不足しています。"
        logger.error(f"Missing API credentials: api_key={bool(api_key)}, search_engine_id={bool(search_engine_id)}")
        return (
            f"エラー: {error_msg}\n\n"
            "必要な設定:\n"
            "- GOOGLE_CSE_API_KEY: Secret Managerに登録済みであることを確認してください\n"
            "- GOOGLE_CSE_ID: .envファイルに設定してください (Custom Search Engine ID)"
        )

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

            # ページ詳細を取得（fetch_details > 0の場合）
            page_contents = []
            if fetch_details > 0:
                urls_to_fetch = [item.get('link') for item in data["items"][:fetch_details] if item.get('link')]
                logger.info(f"Fetching detailed content from {len(urls_to_fetch)} URLs")

                # 並列にページ内容を取得
                html_contents = await asyncio.gather(
                    *[_fetch_page_content(url) for url in urls_to_fetch],
                    return_exceptions=True
                )

                for url, html in zip(urls_to_fetch, html_contents):
                    # 型チェック: htmlがstrであることを確認（Exceptionではない）
                    if isinstance(html, str):
                        text = _extract_text_from_html(html)
                        if text:
                            page_contents.append({"url": url, "content": text})
                            logger.info(f"Successfully fetched content from {url} ({len(text)} chars)")
                        else:
                            logger.warning(f"Failed to extract text from {url}")

            return _format_google_results_with_content(query, data["items"], max_results, page_contents)

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


async def _fetch_page_content(url: str, timeout: float = 10.0) -> Optional[str]:
    """
    指定されたURLからHTMLコンテンツを取得します。

    Args:
        url: 取得するページのURL
        timeout: タイムアウト時間（秒）

    Returns:
        HTMLコンテンツ、またはエラー時はNone
    """
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response.raise_for_status()
            return response.text
    except httpx.TimeoutException:
        logger.warning(f"Timeout fetching URL: {url}")
        return None
    except httpx.HTTPStatusError as e:
        logger.warning(f"HTTP error {e.response.status_code} fetching URL: {url}")
        return None
    except Exception as e:
        logger.warning(f"Error fetching URL {url}: {str(e)}")
        return None


def _extract_text_from_html(html: str, max_length: int = 4000) -> str:
    """
    HTMLから本文テキストを抽出します。

    Args:
        html: HTMLコンテンツ
        max_length: 抽出する最大文字数

    Returns:
        抽出されたテキスト
    """
    try:
        soup = BeautifulSoup(html, 'html.parser')

        # 不要なタグを除去
        for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe', 'noscript']):
            tag.decompose()

        # 本文を抽出（優先順位: article > main > body）
        main_content = (
            soup.find('article') or
            soup.find('main') or
            soup.find('body') or
            soup
        )

        # テキストを抽出して整形
        text = main_content.get_text(separator='\n', strip=True)

        # 連続する空行を削除
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)

        # 長さ制限
        if len(text) > max_length:
            text = text[:max_length] + "..."

        return text
    except Exception as e:
        logger.warning(f"Error extracting text from HTML: {str(e)}")
        return ""


def _format_google_results(query: str, results: list, max_results: int) -> str:
    """Google検索結果を整形する（詳細内容なし）"""
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


def _format_google_results_with_content(
    query: str,
    results: list,
    max_results: int,
    page_contents: list[dict[str, str]]
) -> str:
    """Google検索結果と詳細内容を整形する"""
    if not results or len(results) == 0:
        return f"検索結果: クエリ '{query}' に一致する情報が見つかりませんでした。"

    result_parts = [f"Web検索結果 (Google): '{query}' で {len(results)}件見つかりました。\n"]

    # 検索結果のリスト
    for i, result in enumerate(results[:max_results], 1):
        title = result.get('title', '(タイトルなし)')
        url = result.get('link', '')
        snippet = result.get('snippet', '')

        result_parts.append(f"\n{i}. {title}")

        if url:
            result_parts.append(f"\n   URL: {url}")

        if snippet:
            snippet_text = snippet[:200] + "..." if len(snippet) > 200 else snippet
            result_parts.append(f"\n   概要: {snippet_text}")

    # 詳細内容の追加
    if page_contents:
        result_parts.append(f"\n\n{'='*60}")
        result_parts.append(f"\n詳細内容 (上位{len(page_contents)}件のページから取得)")
        result_parts.append(f"\n{'='*60}\n")

        for i, page in enumerate(page_contents, 1):
            result_parts.append(f"\n[{i}] {page['url']}")
            result_parts.append(f"\n{'-'*60}")
            result_parts.append(f"\n{page['content']}")
            result_parts.append(f"\n{'-'*60}\n")

    logger.info(f"Google search completed: query={query}, results_count={len(results)}, detailed_pages={len(page_contents)}")
    return "".join(result_parts)
