# @file knowledge_base_router.py
# @summary 知識ベース（RAG）管理用のAPIエンドポイント
# @responsibility ドキュメントのアップロード、統計情報取得、削除を提供します
# @note PgVectorStore を使用（FAISSから移行済み）

import shutil
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse

from src.auth import verify_token_auth
from src.core.logger import logger
from src.data import SessionLocal
from src.llm_clean.domain.value_objects import (
    CollectionType,
    RAGContext,
)
from src.llm_clean.infrastructure.vector_stores import (
    get_document_processor,
    get_pgvector_store,
)
from src.llm_clean.presentation.middleware.error_handler import handle_route_errors
from src.llm_clean.presentation.schemas.api_schemas import (
    CreateCollectionRequest,
    UploadTextRequest,
)

router = APIRouter()


@router.post("/api/knowledge-base/documents/upload")
@handle_route_errors
async def upload_document(
    file: UploadFile = File(...),
    collection_name: str = Query(default="default"),
    metadata_title: str | None = None,
    metadata_description: str | None = None,
    user_id: str = Depends(verify_token_auth)
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
    logger.info(
        f"Document upload requested: {file.filename} to collection '{collection_name}'",
        extra={"category": "api"}
    )

    if not file.filename:
        raise HTTPException(status_code=400, detail="ファイル名が指定されていません")

    # 一時ファイルに保存
    temp_file_path = None
    db = SessionLocal()

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

        # コレクションタイプとuser_idを決定
        ctx = RAGContext.from_collection_name(collection_name, auth_user_id=user_id)

        # PgVectorStoreでドキュメントを追加
        vector_store = get_pgvector_store(db, user_id=ctx.user_id)
        documents = [chunk.page_content for chunk in chunks]
        metadatas = [chunk.metadata for chunk in chunks]

        await vector_store._store.add_documents(
            collection_name=collection_name,
            documents=documents,
            metadatas=metadatas,
            collection_type=ctx.collection_type,
            user_id=ctx.user_id
        )

        # 統計情報を取得
        info = await vector_store.get_collection_info(collection_name)
        doc_summary = processor.get_document_summary(chunks)

        logger.info(
            f"Document uploaded successfully: {file.filename} to '{collection_name}' "
            f"({len(chunks)} chunks, {doc_summary['total_characters']} chars)",
            extra={"category": "api"}
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
                "total_documents": info["document_count"] if info else len(chunks),
                "collection_name": collection_name
            }
        })

    finally:
        # 一時ファイルを削除
        if temp_file_path and Path(temp_file_path).exists():
            Path(temp_file_path).unlink()
        db.close()


@router.get("/api/knowledge-base/documents/stats")
@handle_route_errors
async def get_knowledge_base_stats(
    collection_name: str = Query(default="default"),
    user_id: str = Depends(verify_token_auth)
):
    """
    知識ベースの統計情報を取得

    Args:
        collection_name: コレクション名（デフォルト: "default"）

    Returns:
        ドキュメント数、ストレージパスなどの統計情報
    """
    db = SessionLocal()
    try:
        ctx = RAGContext.from_collection_name(collection_name, auth_user_id=user_id)
        vector_store = get_pgvector_store(db, user_id=ctx.user_id)

        info = await vector_store.get_collection_info(collection_name)

        if info is None:
            raise HTTPException(
                status_code=404,
                detail=f"Collection '{collection_name}' not found or expired"
            )

        return JSONResponse(content={
            "success": True,
            "stats": {
                "document_count": info["document_count"],
                "collection_name": info["collection_name"],
                "collection_type": info["collection_type"]
            },
            "metadata": {
                "name": info["collection_name"],
                "collection_type": info["collection_type"],
                "created_at": info.get("created_at"),
                "expires_at": info.get("expires_at")
            }
        })
    finally:
        db.close()


@router.delete("/api/knowledge-base/documents/clear")
@handle_route_errors
async def clear_knowledge_base(
    collection_name: str = Query(default="default"),
    user_id: str = Depends(verify_token_auth)
):
    """
    知識ベースをクリア（全ドキュメントを削除）

    Args:
        collection_name: コレクション名（デフォルト: "default"）

    Returns:
        削除結果
    """
    db = SessionLocal()
    try:
        ctx = RAGContext.from_collection_name(collection_name, auth_user_id=user_id)
        vector_store = get_pgvector_store(db, user_id=ctx.user_id)

        success = await vector_store.delete_collection(collection_name)

        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Collection '{collection_name}' not found"
            )

        logger.info(f"Knowledge base cleared: {collection_name}", extra={"category": "api"})

        return JSONResponse(content={
            "success": True,
            "message": f"コレクション '{collection_name}' をクリアしました"
        })
    finally:
        db.close()


@router.post("/api/knowledge-base/documents/upload-text")
@handle_route_errors
async def upload_text(
    request: UploadTextRequest,
    collection_name: str = Query(default="default"),
    metadata_title: str | None = Query(default=None),
    metadata_description: str | None = Query(default=None),
    user_id: str = Depends(verify_token_auth)
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
    logger.info(
        f"Text upload requested: {len(text)} characters to collection '{collection_name}'",
        extra={"category": "api"}
    )

    if not text.strip():
        raise HTTPException(status_code=400, detail="テキストが空です")

    db = SessionLocal()
    try:
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

        # コレクションタイプとuser_idを決定
        ctx = RAGContext.from_collection_name(collection_name, auth_user_id=user_id)

        # PgVectorStoreでドキュメントを追加
        vector_store = get_pgvector_store(db, user_id=ctx.user_id)
        documents = [chunk.page_content for chunk in chunks]
        metadatas = [chunk.metadata for chunk in chunks]

        await vector_store._store.add_documents(
            collection_name=collection_name,
            documents=documents,
            metadatas=metadatas,
            collection_type=ctx.collection_type,
            user_id=ctx.user_id
        )

        # 統計情報を取得
        info = await vector_store.get_collection_info(collection_name)
        doc_summary = processor.get_document_summary(chunks)

        logger.info(
            f"Text uploaded successfully to '{collection_name}': "
            f"{len(chunks)} chunks, {doc_summary['total_characters']} chars",
            extra={"category": "api"}
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
                "total_documents": info["document_count"] if info else len(chunks),
                "collection_name": collection_name
            }
        })
    finally:
        db.close()


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
    db = SessionLocal()
    try:
        vector_store = get_pgvector_store(db, user_id=None)

        # コレクション名の決定
        if request.name:
            collection_name = request.name
        else:
            collection_name = vector_store.generate_temp_collection_name(request.prefix)

        # PgVectorStoreでは、ドキュメント追加時にコレクションが作成される
        # ここでは空のコレクション情報を返す
        logger.info(
            f"Temp collection created: {collection_name} (TTL: {request.ttl_hours}h)",
            extra={"category": "api"}
        )

        return JSONResponse(content={
            "success": True,
            "message": f"一時コレクション '{collection_name}' を作成しました",
            "collection": {
                "name": collection_name,
                "collection_type": "temp",
                "ttl_hours": request.ttl_hours,
                "description": request.description
            }
        })
    finally:
        db.close()


@router.get("/api/knowledge-base/collections")
@handle_route_errors
async def list_collections(
    collection_type: CollectionType | None = Query(default=None),
    include_expired: bool = Query(default=False),
    user_id: str = Depends(verify_token_auth)
):
    """
    コレクション一覧を取得

    Args:
        collection_type: フィルタするコレクションタイプ（temp/persistent、デフォルト: 全て）
        include_expired: 期限切れコレクションを含めるか（デフォルト: False）
            ※ PgVectorStoreでは期限切れは自動的に除外されます

    Returns:
        コレクション一覧
    """
    db = SessionLocal()
    try:
        vector_store = get_pgvector_store(db, user_id=user_id)

        collections = await vector_store._store.list_collections(
            user_id=user_id,
            collection_type=collection_type
        )

        return JSONResponse(content={
            "success": True,
            "count": len(collections),
            "collections": collections
        })
    finally:
        db.close()


@router.delete("/api/knowledge-base/collections/{name}")
@handle_route_errors
async def delete_collection(
    name: str,
    user_id: str = Depends(verify_token_auth)
):
    """
    コレクションを削除

    Args:
        name: コレクション名

    Returns:
        削除結果

    Notes:
        - デフォルトコレクションは削除できません
    """
    # デフォルトコレクションの削除を防止
    if name == "default":
        raise HTTPException(
            status_code=400,
            detail="デフォルトコレクションは削除できません"
        )

    db = SessionLocal()
    try:
        ctx = RAGContext.from_collection_name(name, auth_user_id=user_id)
        vector_store = get_pgvector_store(db, user_id=ctx.user_id)

        # 存在確認
        exists = await vector_store.collection_exists(name)
        if not exists:
            raise HTTPException(
                status_code=404,
                detail=f"コレクション '{name}' が見つかりません"
            )

        success = await vector_store.delete_collection(name)

        if success:
            logger.info(f"Collection deleted: {name}", extra={"category": "api"})
            return JSONResponse(content={
                "success": True,
                "message": f"コレクション '{name}' を削除しました"
            })
        else:
            raise HTTPException(
                status_code=500,
                detail=f"コレクション '{name}' の削除に失敗しました"
            )
    finally:
        db.close()


@router.post("/api/knowledge-base/collections/cleanup")
@handle_route_errors
async def cleanup_expired_collections():
    """
    期限切れコレクションをクリーンアップ

    Returns:
        削除されたコレクション数
    """
    db = SessionLocal()
    try:
        vector_store = get_pgvector_store(db, user_id=None)
        deleted_count = await vector_store.cleanup_expired()

        logger.info(
            f"Cleanup completed: {deleted_count} documents deleted",
            extra={"category": "api"}
        )

        return JSONResponse(content={
            "success": True,
            "message": f"{deleted_count}個の期限切れドキュメントを削除しました",
            "deleted_count": deleted_count
        })
    finally:
        db.close()
