from langchain.tools import tool

from src.core.logger import logger
from src.data import SessionLocal
from src.llm_clean.domain.value_objects import RAGContext
from src.llm_clean.infrastructure.vector_stores import get_pgvector_store


@tool
async def search_knowledge_base(
    query: str,
    max_results: int = 4,
    collection_name: str = "default",
    similarity_threshold: float = 0.0
) -> str:
    """
    ローカル知識ベース（ベクトルデータベース）から関連情報を検索します。

    このツールは、事前にアップロードされたドキュメント（PDF、テキストファイルなど）から
    意味的に類似した情報を検索し、詳細な内容を取得します。

    【重要】カテゴリー別の知識ベース検索：
    - ユーザーが特定のカテゴリーについて質問した場合、そのカテゴリー専用のコレクションを検索してください
    - カテゴリー専用コレクション名の形式: "category_<カテゴリー名>"
    - 例: "01_調べ物"カテゴリー → collection_name="category_01_調べ物"
    - 例: "技術/Python"カテゴリー → collection_name="category_技術_Python"（スラッシュはアンダースコアに変換）
    - カテゴリー名が不明な場合は、デフォルトの "default" コレクションを使用

    使用例:
    - ユーザー: "調べ物について教えて" → collection_name="category_01_調べ物"を試す
    - ユーザー: "技術に関する情報は？" → collection_name="category_技術"を試す
    - ユーザー: "アップロードしたドキュメントについて" → collection_name="default"を使用
    - コレクションが見つからない場合は、エラーメッセージが返されます

    Args:
        query: 検索クエリ（例: "機械学習の基礎について", "契約書の重要条項"）
        max_results: 取得する検索結果の最大数（1-10、デフォルト: 4）
        collection_name: 検索対象のコレクション名
            - デフォルト: "default"（一般的なドキュメント）
            - カテゴリー別: "category_<カテゴリー名>"
            - Web検索結果: "web_<タイムスタンプ>"
        similarity_threshold: 類似度の閾値（0.0-1.0、デフォルト: 0.0）
            - 0.0: フィルタリングなし（全結果を返す）
            - 0.5以上: 中程度以上の類似度のみ
            - 0.7以上: 高い類似度のみ

    Returns:
        検索結果と詳細内容、またはエラーメッセージ
    """
    logger.info(
        f"search_knowledge_base tool called: query={query}, max_results={max_results}, "
        f"collection={collection_name}, threshold={similarity_threshold}",
        extra={"category": "tool"}
    )

    # パラメータの範囲チェック
    max_results = max(1, min(10, max_results))
    similarity_threshold = max(0.0, min(1.0, similarity_threshold))

    db = SessionLocal()
    try:
        # RAGContextで user_id を決定
        ctx = RAGContext.from_collection_name(collection_name)
        vector_store = get_pgvector_store(db, user_id=ctx.user_id)

        # コレクションの存在確認
        exists = await vector_store.collection_exists(collection_name)
        if not exists:
            return (
                f"コレクション '{collection_name}' が見つかりません。\n\n"
                "コレクションが存在しないか、期限切れで削除された可能性があります。\n"
                "別のコレクションを指定するか、新しいドキュメントをアップロードしてください。"
            )

        # コレクション情報を取得
        collection_info = await vector_store.get_collection_info(collection_name)

        if collection_info is None or collection_info.get("document_count", 0) == 0:
            return (
                f"コレクション '{collection_name}' は空です。\n\n"
                "まだドキュメントがアップロードされていません。\n"
                "ドキュメントを追加してから検索を実行してください。"
            )

        # 類似度検索を実行（フィルタリング用に多めに取得）
        fetch_count = max_results * 2 if similarity_threshold > 0 else max_results
        results = await vector_store.search(
            collection_name=collection_name,
            query=query,
            top_k=fetch_count
        )

        # similarity_threshold でフィルタリング
        if similarity_threshold > 0 and results:
            original_count = len(results)
            results = [r for r in results if r.get("score", 0) >= similarity_threshold]
            logger.info(
                f"Filtered results by threshold {similarity_threshold}: "
                f"{original_count} -> {len(results)}",
                extra={"category": "tool"}
            )

        # max_results に制限
        results = results[:max_results]

        if not results:
            response = f"検索結果: クエリ '{query}' に一致する情報が見つかりませんでした。"
            if similarity_threshold > 0:
                response += f"\n（類似度閾値 {similarity_threshold} を下回る結果は除外されました）"
            logger.info(f"search_knowledge_base response: {response}", extra={"category": "tool"})
            return response

        # 結果を整形
        stats = {
            "collection_name": collection_name,
            "document_count": collection_info.get("document_count", 0)
        }
        response = _format_search_results(query, results, stats)

        # 応答の長さをログ出力
        logger.info(
            f"search_knowledge_base response generated: "
            f"collection={collection_name}, "
            f"query={query}, results_count={len(results)}, response_length={len(response)} chars",
            extra={"category": "tool"}
        )
        logger.debug(f"Full response:\n{response}", extra={"category": "tool"})

        return response

    except Exception as e:
        error_msg = str(e)
        logger.error(
            f"Error in search_knowledge_base: query={query}, error={error_msg}",
            extra={"category": "tool"}
        )
        return f"エラー: 知識ベースの検索に失敗しました: {error_msg}"

    finally:
        db.close()


def _format_search_results(query: str, results: list, stats: dict) -> str:
    """検索結果を整形する

    Args:
        query: 検索クエリ
        results: 検索結果のリスト
        stats: ベクトルストアの統計情報

    Returns:
        整形された検索結果の文字列
    """
    result_parts = [
        f"知識ベース検索結果: '{query}' で {len(results)}件見つかりました。\n",
        f"（知識ベース内の総ドキュメント数: {stats['document_count']}チャンク）\n"
    ]

    for i, result in enumerate(results, 1):
        content = result["content"]
        metadata = result.get("metadata", {})
        score = result.get("score", 0.0)

        # メタデータから情報を取得
        file_name = metadata.get("file_name", "不明")
        chunk_index = metadata.get("chunk_index", "?")
        total_chunks = metadata.get("total_chunks", "?")

        result_parts.append(f"\n{'='*60}")
        result_parts.append(f"\n[結果 {i}] 類似度スコア: {score:.4f}")
        result_parts.append(f"\nソース: {file_name} (チャンク {chunk_index + 1}/{total_chunks})")

        # ページ番号がある場合（PDF）
        if "page_number" in metadata:
            result_parts.append(f" - ページ {metadata['page_number']}")

        result_parts.append(f"\n{'-'*60}")
        result_parts.append(f"\n{content}")
        result_parts.append(f"\n{'-'*60}")

    logger.info(
        f"Knowledge base search completed: collection={stats.get('collection_name', 'unknown')}, "
        f"query={query}, results_count={len(results)}",
        extra={"category": "tool"}
    )
    return "".join(result_parts)
