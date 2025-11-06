from langchain.tools import tool
from src.core.logger import logger
from src.llm.rag.collection_manager import CollectionManager
from typing import Optional


# グローバルなコレクションマネージャーのインスタンス
_collection_manager: Optional[CollectionManager] = None


def get_collection_manager() -> CollectionManager:
    """コレクションマネージャーのシングルトンインスタンスを取得

    Returns:
        CollectionManager: コレクションマネージャーのインスタンス
    """
    global _collection_manager
    if _collection_manager is None:
        _collection_manager = CollectionManager()
        logger.info("CollectionManager instance created for search_knowledge_base tool")
    return _collection_manager


@tool
async def search_knowledge_base(
    query: str,
    max_results: int = 4,
    collection_name: str = "default"
) -> str:
    """
    ローカル知識ベース（ベクトルデータベース）から関連情報を検索します。

    このツールは、事前にアップロードされたドキュメント（PDF、テキストファイルなど）から
    意味的に類似した情報を検索し、詳細な内容を取得します。

    使用例:
    - ユーザーがアップロードしたドキュメントの内容について質問する場合
    - 特定のトピックに関する保存された知識を参照する場合
    - プライベートな情報や社内ドキュメントを検索する場合
    - Web検索ではなく、ローカルの知識ベースを使いたい場合

    Args:
        query: 検索クエリ（例: "機械学習の基礎について", "契約書の重要条項"）
        max_results: 取得する検索結果の最大数（1-10、デフォルト: 4）
        collection_name: 検索対象のコレクション名（デフォルト: "default"）

    Returns:
        検索結果と詳細内容、またはエラーメッセージ
    """
    logger.info(f"search_knowledge_base tool called: query={query}, max_results={max_results}, collection={collection_name}")

    # パラメータの範囲チェック
    max_results = max(1, min(10, max_results))

    try:
        # コレクションマネージャーを取得
        manager = get_collection_manager()

        # 指定されたコレクションを取得
        vector_store = manager.get_collection(collection_name)

        if vector_store is None:
            return (
                f"コレクション '{collection_name}' が見つかりません。\n\n"
                "コレクションが存在しないか、期限切れで削除された可能性があります。\n"
                "別のコレクションを指定するか、新しいドキュメントをアップロードしてください。"
            )

        # ベクトルストアの統計情報を取得
        stats = vector_store.get_stats()

        if not stats["exists"] or stats["document_count"] == 0:
            return (
                f"コレクション '{collection_name}' は空です。\n\n"
                "まだドキュメントがアップロードされていません。\n"
                "ドキュメントを追加してから検索を実行してください。"
            )

        # 類似度検索を実行
        results = vector_store.similarity_search(
            query=query,
            k=max_results
        )

        if not results:
            return f"検索結果: クエリ '{query}' に一致する情報が見つかりませんでした。"

        # 結果を整形
        return _format_search_results(query, results, stats)

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Error in search_knowledge_base: query={query}, error={error_msg}")
        return f"エラー: 知識ベースの検索に失敗しました: {error_msg}"


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

    logger.info(f"Knowledge base search completed: collection={stats.get('collection_name', 'unknown')}, query={query}, results_count={len(results)}")
    return "".join(result_parts)
