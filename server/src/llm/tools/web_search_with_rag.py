# @file web_search_with_rag.py
# @summary Web検索結果をRAG化する拡張ツール
# @responsibility Web検索を実行し、結果を一時コレクションにベクトル化して保存します

from langchain.tools import tool
from src.core.logger import logger
from src.llm.rag.collection_manager import CollectionManager
from src.llm.rag.document_processor import DocumentProcessor
from typing import Optional
import os
import httpx
import asyncio
from bs4 import BeautifulSoup  # type: ignore
from datetime import datetime


# グローバルなインスタンス
_collection_manager: Optional[CollectionManager] = None
_document_processor: Optional[DocumentProcessor] = None


def get_collection_manager() -> CollectionManager:
    """コレクションマネージャーのシングルトンインスタンスを取得

    Returns:
        CollectionManager: コレクションマネージャーのインスタンス
    """
    global _collection_manager
    if _collection_manager is None:
        _collection_manager = CollectionManager()
        logger.info("CollectionManager instance created for web_search_with_rag tool")
    return _collection_manager


def get_document_processor() -> DocumentProcessor:
    """ドキュメントプロセッサのシングルトンインスタンスを取得

    Returns:
        DocumentProcessor: ドキュメントプロセッサのインスタンス
    """
    global _document_processor
    if _document_processor is None:
        _document_processor = DocumentProcessor(
            chunk_size=1000,
            chunk_overlap=200
        )
        logger.info("DocumentProcessor instance created for web_search_with_rag tool")
    return _document_processor


@tool
async def web_search_with_rag(
    query: str,
    max_results: int = 5,
    collection_ttl_hours: float = 1.0
) -> str:
    """
    Web検索を実行し、結果を一時RAGコレクションに保存します。

    このツールは以下の処理を実行します：
    1. Google Custom Search APIでWeb検索を実行
    2. 上位結果のページ内容を全文取得
    3. 一時コレクションを作成（TTL: デフォルト1時間）
    4. 取得したHTMLテキストをベクトル化してRAGに保存
    5. 作成されたコレクション名を返す

    返されたコレクション名を使って、search_knowledge_baseツールで
    深いセマンティック検索が可能になります。

    使用例:
    1. このツールでWeb検索結果をRAG化: web_search_with_rag("Python async best practices")
    2. 返されたコレクション名を使って深い検索: search_knowledge_base("asyncio event loop", collection_name="web_1762386000")

    Args:
        query: 検索クエリ（例: "機械学習の最新トレンド", "FastAPI チュートリアル"）
        max_results: 取得する検索結果の最大数（1-10、デフォルト: 5）
        collection_ttl_hours: コレクションのTTL（時間単位、デフォルト: 1.0）

    Returns:
        作成されたコレクション名と検索結果サマリー、またはエラーメッセージ
    """
    logger.info(
        f"web_search_with_rag tool called: query={query}, "
        f"max_results={max_results}, ttl={collection_ttl_hours}h"
    )

    # パラメータの範囲チェック
    max_results = max(1, min(10, max_results))
    collection_ttl_hours = max(0.1, min(24.0, collection_ttl_hours))

    # Google Custom Search APIのキー確認
    api_key = os.getenv("GOOGLE_API_KEY")
    search_engine_id = os.getenv("GOOGLE_CSE_ID")

    if not api_key or not search_engine_id:
        error_msg = "Google Custom Search APIの設定が不足しています。"
        logger.error(
            f"Missing API credentials: api_key={bool(api_key)}, "
            f"search_engine_id={bool(search_engine_id)}"
        )
        return (
            f"エラー: {error_msg}\n\n"
            ".envファイルに以下の環境変数を設定してください:\n"
            "- GOOGLE_API_KEY: Google API Key\n"
            "- GOOGLE_CSE_ID: Custom Search Engine ID"
        )

    try:
        # 1. Google Custom Search APIで検索実行
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

            # 2. 全ページの内容を並列取得
            search_results = data["items"][:max_results]
            logger.info(f"Fetching full content from {len(search_results)} URLs")

            # URLとメタデータを準備
            fetch_tasks = []
            for i, result in enumerate(search_results, 1):
                url_to_fetch = result.get('link')
                if url_to_fetch:
                    metadata = {
                        "url": url_to_fetch,
                        "title": result.get('title', '(タイトルなし)'),
                        "snippet": result.get('snippet', ''),
                        "search_query": query,
                        "search_rank": i,
                        "source": "google_web_search",
                        "fetched_at": datetime.now().isoformat()
                    }
                    fetch_tasks.append(_fetch_and_extract(url_to_fetch, metadata))

            # 並列にページ取得と抽出を実行
            page_data_list = await asyncio.gather(*fetch_tasks, return_exceptions=True)

            # 成功したページのみフィルタ
            successful_pages = []
            for page_data in page_data_list:
                if isinstance(page_data, dict) and page_data.get("text"):
                    successful_pages.append(page_data)
                    logger.info(
                        f"Successfully fetched and extracted: {page_data['metadata']['url']} "
                        f"({len(page_data['text'])} chars)"
                    )

            if not successful_pages:
                return (
                    f"エラー: クエリ '{query}' で検索結果は見つかりましたが、"
                    "ページ内容の取得に失敗しました。\n"
                    "すべてのページでアクセスエラーまたはコンテンツ抽出エラーが発生しました。"
                )

            # 3. 一時コレクションを作成
            manager = get_collection_manager()
            collection_name = manager.generate_temp_collection_name("web")
            vector_store = manager.create_collection(
                name=collection_name,
                collection_type="temp",
                ttl_hours=collection_ttl_hours,
                description=f"Web search results for: {query}"
            )

            logger.info(
                f"Created temporary collection: {collection_name} "
                f"(TTL: {collection_ttl_hours}h)"
            )

            # 4. DocumentProcessorでテキストを処理
            processor = get_document_processor()
            all_chunks = []

            for page_data in successful_pages:
                text = page_data["text"]
                metadata = page_data["metadata"]

                # テキストをチャンク化
                chunks = processor.load_from_text(text, metadata=metadata)
                all_chunks.extend(chunks)

                logger.debug(
                    f"Processed {metadata['url']}: {len(chunks)} chunks created"
                )

            # 5. VectorStoreに追加
            vector_store.add_documents(all_chunks, save_after_add=True)

            logger.info(
                f"Added {len(all_chunks)} chunks from {len(successful_pages)} pages "
                f"to collection '{collection_name}'"
            )

            # 6. 結果サマリーを返す
            return _format_rag_result(
                query=query,
                collection_name=collection_name,
                pages_count=len(successful_pages),
                chunks_count=len(all_chunks),
                ttl_hours=collection_ttl_hours,
                search_results=search_results[:len(successful_pages)]
            )

    except httpx.HTTPStatusError as e:
        error_msg = f"HTTP {e.response.status_code}: {e.response.text}"
        logger.error(f"HTTP error in web_search_with_rag: query={query}, error={error_msg}")

        if e.response.status_code == 429:
            return "エラー: 検索のレート制限に達しました。しばらく待ってから再試行してください。"
        elif e.response.status_code == 403:
            return "エラー: APIキーが無効か、権限がありません。設定を確認してください。"
        else:
            return f"エラー: Web検索に失敗しました (HTTP {e.response.status_code})"

    except httpx.TimeoutException:
        logger.error(f"Timeout in web_search_with_rag: query={query}")
        return "エラー: 検索がタイムアウトしました。後でもう一度お試しください。"

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error in web_search_with_rag: query={query}, error={error_msg}")
        return f"エラー: Web検索RAG化に失敗しました: {error_msg}"


async def _fetch_and_extract(url: str, metadata: dict) -> dict:
    """URLからHTMLを取得してテキストを抽出

    Args:
        url: 取得するURL
        metadata: ページのメタデータ

    Returns:
        {"text": str, "metadata": dict} または空辞書（エラー時）
    """
    try:
        # HTMLコンテンツを取得
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            })
            response.raise_for_status()
            html = response.text

        # テキストを抽出（制限なし - チャンク化に任せる）
        text = _extract_text_from_html(html, max_length=None)

        if not text:
            logger.warning(f"No text extracted from {url}")
            return {}

        return {
            "text": text,
            "metadata": metadata
        }

    except httpx.TimeoutException:
        logger.warning(f"Timeout fetching URL: {url}")
        return {}
    except httpx.HTTPStatusError as e:
        logger.warning(f"HTTP error {e.response.status_code} fetching URL: {url}")
        return {}
    except Exception as e:
        logger.warning(f"Error fetching and extracting {url}: {str(e)}")
        return {}


def _extract_text_from_html(html: str, max_length: Optional[int] = None) -> str:
    """HTMLから本文テキストを抽出

    Args:
        html: HTMLコンテンツ
        max_length: 抽出する最大文字数（Noneの場合は制限なし）

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

        # 長さ制限（指定された場合）
        if max_length is not None and len(text) > max_length:
            text = text[:max_length] + "..."

        return text

    except Exception as e:
        logger.warning(f"Error extracting text from HTML: {str(e)}")
        return ""


def _format_rag_result(
    query: str,
    collection_name: str,
    pages_count: int,
    chunks_count: int,
    ttl_hours: float,
    search_results: list
) -> str:
    """RAG化結果を整形

    Args:
        query: 検索クエリ
        collection_name: 作成されたコレクション名
        pages_count: 取得したページ数
        chunks_count: 作成されたチャンク数
        ttl_hours: TTL（時間）
        search_results: Google検索結果のリスト

    Returns:
        整形された結果文字列
    """
    result_parts = [
        f"✓ Web検索結果をRAGコレクションに保存しました\n",
        f"\n{'='*60}\n",
        f"検索クエリ: {query}\n",
        f"コレクション名: {collection_name}\n",
        f"保存されたページ数: {pages_count}\n",
        f"作成されたチャンク数: {chunks_count}\n",
        f"有効期限: {ttl_hours}時間後に自動削除\n",
        f"\n{'='*60}\n",
        f"\n取得したページ:\n"
    ]

    for i, result in enumerate(search_results, 1):
        title = result.get('title', '(タイトルなし)')
        url = result.get('link', '')
        snippet = result.get('snippet', '')

        result_parts.append(f"\n{i}. {title}")
        result_parts.append(f"\n   URL: {url}")
        if snippet:
            snippet_text = snippet[:150] + "..." if len(snippet) > 150 else snippet
            result_parts.append(f"\n   概要: {snippet_text}")

    result_parts.append(f"\n\n{'='*60}\n")
    result_parts.append(
        f"\n💡 次のステップ:\n"
        f"search_knowledge_baseツールを使って、このコレクション内を検索できます。\n"
        f"例: search_knowledge_base(\n"
        f"    query=\"具体的な検索クエリ\",\n"
        f"    collection_name=\"{collection_name}\"\n"
        f")\n"
    )

    return "".join(result_parts)
