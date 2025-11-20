# @file knowledge_base_router.py
# @summary 知識ベース（RAG）管理用のAPIエンドポイント
# @responsibility ドキュメントのアップロード、統計情報取得、削除を提供します

import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse

from src.core.logger import logger
from src.llm_clean.infrastructure.vector_stores.collection_manager import CollectionType
from src.llm_clean.infrastructure.vector_stores import get_collection_manager, get_document_processor
from src.llm_clean.infrastructure.vector_stores.faiss_vector_store import VectorStoreManager
from src.llm_clean.presentation.middleware.error_handler import handle_route_errors
from src.llm_clean.presentation.schemas.api_schemas import CreateCollectionRequest, UploadTextRequest

router = APIRouter()


def get_vector_store(collection_name: str = "default", create_if_missing: bool = False) -> VectorStoreManager:
    """ベクトルストアを取得（コレクション名を指定可能）

    Args:
        collection_name: コレクション名
        create_if_missing: 存在しない場合に自動作成するかどうか

    Returns:
        VectorStoreManager

    Raises:
        HTTPException: コレクションが見つからない場合（create_if_missing=Falseの場合）
    """
    manager = get_collection_manager()
    vector_store = manager.get_collection(collection_name)

    if vector_store is None:
        if create_if_missing:
            # 永久保存コレクションとして作成
            logger.info(f"Creating new persistent collection: {collection_name}")
            vector_store = manager.create_collection(
                name=collection_name,
                collection_type="persistent",
                description=f"Auto-created collection for {collection_name}"
            )
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Collection '{collection_name}' not found or expired"
            )

    return vector_store


@router.post("/api/knowledge-base/documents/upload")
@handle_route_errors
async def upload_document(
    file: UploadFile = File(...),
    collection_name: str = Query(default="default"),
    metadata_title: str | None = None,
    metadata_description: str | None = None
):
    """
    ドキュメントをアップロードして知識ベースに追加

    Args:
        file: アップロードするファイル（PDF, TXT, MD, など）
        collection_name: アップロード先のコレクション名（デフォルト: "default"）
        metadata_title: ドキュメントのタイトル（オプション）
        metadata_description: ドキュメントの説明（オプション）

    Returns:
        アップロード結果とドキュメント情報
    """
    logger.info(f"Document upload requested: {file.filename} to collection '{collection_name}'")

    if not file.filename:
        raise HTTPException(status_code=400, detail="ファイル名が指定されていません")

    # 一時ファイルに保存
    temp_file_path = None
    try:
        # 一時ファイルを作成
        suffix = Path(file.filename).suffix
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        # ドキュメントを処理
        processor = get_document_processor()

        # 追加メタデータ
        additional_metadata = {}
        if metadata_title:
            additional_metadata["title"] = metadata_title
        if metadata_description:
            additional_metadata["description"] = metadata_description

        chunks = processor.load_from_file(
            temp_file_path,
            additional_metadata=additional_metadata
        )

        if not chunks:
            raise HTTPException(status_code=400, detail="ドキュメントの処理に失敗しました")

        # ベクトルストアに追加（存在しない場合は自動作成）
        vector_store = get_vector_store(collection_name, create_if_missing=True)
        vector_store.add_documents(chunks, save_after_add=True)

        # 統計情報を取得
        stats = vector_store.get_stats()
        doc_summary = processor.get_document_summary(chunks)

        logger.info(
            f"Document uploaded successfully: {file.filename} to '{collection_name}' "
            f"({len(chunks)} chunks, {doc_summary['total_characters']} chars)"
        )

        return JSONResponse(content={
            "success": True,
            "message": f"ドキュメント '{file.filename}' をコレクション '{collection_name}' に追加しました",
            "document": {
                "filename": file.filename,
                "chunks_created": len(chunks),
                "total_characters": doc_summary["total_characters"],
                "average_chunk_size": doc_summary["average_chunk_size"]
            },
            "knowledge_base": {
                "total_documents": stats["document_count"],
                "collection_name": stats["collection_name"]
            }
        })

    finally:
        # 一時ファイルを削除
        if temp_file_path and Path(temp_file_path).exists():
            Path(temp_file_path).unlink()


@router.get("/api/knowledge-base/documents/stats")
@handle_route_errors
async def get_knowledge_base_stats(
    collection_name: str = Query(default="default")
):
    """
    知識ベースの統計情報を取得

    Args:
        collection_name: コレクション名（デフォルト: "default"）

    Returns:
        ドキュメント数、ストレージパスなどの統計情報
    """
    vector_store = get_vector_store(collection_name)
    stats = vector_store.get_stats()

    # コレクションメタデータも含める
    manager = get_collection_manager()
    metadata = manager.get_metadata(collection_name)

    return JSONResponse(content={
        "success": True,
        "stats": stats,
        "metadata": metadata.model_dump(mode="json") if metadata else None
    })


@router.delete("/api/knowledge-base/documents/clear")
@handle_route_errors
async def clear_knowledge_base(
    collection_name: str = Query(default="default")
):
    """
    知識ベースをクリア（全ドキュメントを削除）

    Args:
        collection_name: コレクション名（デフォルト: "default"）

    Returns:
        削除結果
    """
    vector_store = get_vector_store(collection_name)
    vector_store.clear()

    logger.info(f"Knowledge base cleared: {collection_name}")

    return JSONResponse(content={
        "success": True,
        "message": f"コレクション '{collection_name}' をクリアしました"
    })


@router.post("/api/knowledge-base/documents/upload-text")
@handle_route_errors
async def upload_text(
    request: UploadTextRequest,
    collection_name: str = Query(default="default"),
    metadata_title: str | None = Query(default=None),
    metadata_description: str | None = Query(default=None)
):
    """
    テキストを直接アップロードして知識ベースに追加

    Args:
        text: アップロードするテキスト
        collection_name: アップロード先のコレクション名（デフォルト: "default"）
        metadata_title: ドキュメントのタイトル（オプション）
        metadata_description: ドキュメントの説明（オプション）

    Returns:
        アップロード結果とドキュメント情報
    """
    text = request.text
    logger.info(f"Text upload requested: {len(text)} characters to collection '{collection_name}'")

    if not text.strip():
        raise HTTPException(status_code=400, detail="テキストが空です")

    # ドキュメントを処理
    processor = get_document_processor()

    # 追加メタデータ
    metadata = {}
    if metadata_title:
        metadata["title"] = metadata_title
    if metadata_description:
        metadata["description"] = metadata_description

    chunks = processor.load_from_text(text, metadata=metadata)

    if not chunks:
        raise HTTPException(status_code=400, detail="テキストの処理に失敗しました")

    # ベクトルストアに追加（存在しない場合は自動作成）
    vector_store = get_vector_store(collection_name, create_if_missing=True)
    vector_store.add_documents(chunks, save_after_add=True)

    # 統計情報を取得
    stats = vector_store.get_stats()
    doc_summary = processor.get_document_summary(chunks)

    logger.info(
        f"Text uploaded successfully to '{collection_name}': "
        f"{len(chunks)} chunks, {doc_summary['total_characters']} chars"
    )

    return JSONResponse(content={
        "success": True,
        "message": f"テキストをコレクション '{collection_name}' に追加しました",
        "document": {
            "chunks_created": len(chunks),
            "total_characters": doc_summary["total_characters"],
            "average_chunk_size": doc_summary["average_chunk_size"]
        },
        "knowledge_base": {
            "total_documents": stats["document_count"],
            "collection_name": stats["collection_name"]
        }
    })


# === コレクション管理エンドポイント ===

@router.post("/api/knowledge-base/collections/temp")
@handle_route_errors
async def create_temp_collection(request: CreateCollectionRequest):
    """
    一時コレクションを作成

    Args:
        request: コレクション作成リクエスト
            - name: コレクション名（Noneの場合は自動生成）
            - prefix: 自動生成時のプレフィックス（デフォルト: "temp"）
            - ttl_hours: TTL（時間単位、デフォルト: 1.0）
            - description: 説明（オプション）

    Returns:
        作成されたコレクション情報
    """
    manager = get_collection_manager()

    # コレクション名の決定
    if request.name:
        collection_name = request.name
    else:
        collection_name = manager.generate_temp_collection_name(request.prefix)

    # コレクション作成
    manager.create_collection(
        name=collection_name,
        collection_type="temp",
        ttl_hours=request.ttl_hours,
        description=request.description
    )

    # メタデータ取得
    metadata = manager.get_metadata(collection_name)

    logger.info(f"Temp collection created: {collection_name}")

    return JSONResponse(content={
        "success": True,
        "message": f"一時コレクション '{collection_name}' を作成しました",
        "collection": metadata.model_dump(mode="json") if metadata else None
    })


@router.get("/api/knowledge-base/collections")
@handle_route_errors
async def list_collections(
    collection_type: CollectionType | None = Query(default=None),
    include_expired: bool = Query(default=False)
):
    """
    コレクション一覧を取得

    Args:
        collection_type: フィルタするコレクションタイプ（temp/persistent、デフォルト: 全て）
        include_expired: 期限切れコレクションを含めるか（デフォルト: False）

    Returns:
        コレクション一覧
    """
    manager = get_collection_manager()
    collections = manager.list_collections(
        collection_type=collection_type,
        include_expired=include_expired
    )

    # モデルを辞書に変換
    collections_data = [col.model_dump(mode="json") for col in collections]

    return JSONResponse(content={
        "success": True,
        "count": len(collections_data),
        "collections": collections_data
    })


@router.delete("/api/knowledge-base/collections/{name}")
@handle_route_errors
async def delete_collection(name: str):
    """
    コレクションを削除

    Args:
        name: コレクション名

    Returns:
        削除結果

    Notes:
        - デフォルトコレクションは削除できません
    """
    manager = get_collection_manager()

    # デフォルトコレクションの削除を防止
    if name == "default":
        raise HTTPException(
            status_code=400,
            detail="デフォルトコレクションは削除できません"
        )

    success = manager.delete_collection(name)

    if success:
        logger.info(f"Collection deleted: {name}")
        return JSONResponse(content={
            "success": True,
            "message": f"コレクション '{name}' を削除しました"
        })
    else:
        raise HTTPException(
            status_code=404,
            detail=f"コレクション '{name}' が見つかりません"
        )


@router.post("/api/knowledge-base/collections/cleanup")
@handle_route_errors
async def cleanup_expired_collections():
    """
    期限切れコレクションをクリーンアップ

    Returns:
        削除されたコレクション数
    """
    manager = get_collection_manager()
    deleted_count = manager.cleanup_expired()

    logger.info(f"Cleanup completed: {deleted_count} collections deleted")

    return JSONResponse(content={
        "success": True,
        "message": f"{deleted_count}個の期限切れコレクションを削除しました",
        "deleted_count": deleted_count
    })
