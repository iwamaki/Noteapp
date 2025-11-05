# @file knowledge_base_router.py
# @summary 知識ベース（RAG）管理用のAPIエンドポイント
# @responsibility ドキュメントのアップロード、統計情報取得、削除を提供します

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from typing import Optional, List
import tempfile
import shutil
from pathlib import Path
from pydantic import BaseModel

from src.llm.rag.vector_store import VectorStoreManager
from src.llm.rag.document_processor import DocumentProcessor
from src.llm.rag.collection_manager import CollectionManager, CollectionType
from src.core.logger import logger

router = APIRouter()

# グローバルなインスタンス
_collection_manager: Optional[CollectionManager] = None
_document_processor: Optional[DocumentProcessor] = None


def get_collection_manager() -> CollectionManager:
    """コレクションマネージャーのシングルトンインスタンスを取得"""
    global _collection_manager
    if _collection_manager is None:
        _collection_manager = CollectionManager()
    return _collection_manager


def get_vector_store(collection_name: str = "default") -> VectorStoreManager:
    """ベクトルストアを取得（コレクション名を指定可能）"""
    manager = get_collection_manager()
    vector_store = manager.get_collection(collection_name)

    if vector_store is None:
        raise HTTPException(
            status_code=404,
            detail=f"Collection '{collection_name}' not found or expired"
        )

    return vector_store


def get_document_processor() -> DocumentProcessor:
    """ドキュメントプロセッサのシングルトンインスタンスを取得"""
    global _document_processor
    if _document_processor is None:
        _document_processor = DocumentProcessor(
            chunk_size=1000,
            chunk_overlap=200
        )
    return _document_processor


# リクエスト/レスポンスモデル
class CreateCollectionRequest(BaseModel):
    name: Optional[str] = None
    prefix: str = "temp"
    ttl_hours: float = 1.0
    description: Optional[str] = None


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    collection_name: str = Query(default="default"),
    metadata_title: Optional[str] = None,
    metadata_description: Optional[str] = None
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

        # ベクトルストアに追加
        vector_store = get_vector_store(collection_name)
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ドキュメントのアップロードに失敗しました: {str(e)}")

    finally:
        # 一時ファイルを削除
        if temp_file_path and Path(temp_file_path).exists():
            Path(temp_file_path).unlink()


@router.get("/documents/stats")
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
    try:
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting knowledge base stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"統計情報の取得に失敗しました: {str(e)}")


@router.delete("/documents/clear")
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
    try:
        vector_store = get_vector_store(collection_name)
        vector_store.clear()

        logger.info(f"Knowledge base cleared: {collection_name}")

        return JSONResponse(content={
            "success": True,
            "message": f"コレクション '{collection_name}' をクリアしました"
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing knowledge base: {str(e)}")
        raise HTTPException(status_code=500, detail=f"知識ベースのクリアに失敗しました: {str(e)}")


@router.post("/documents/upload-text")
async def upload_text(
    text: str,
    collection_name: str = Query(default="default"),
    metadata_title: Optional[str] = None,
    metadata_description: Optional[str] = None
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
    logger.info(f"Text upload requested: {len(text)} characters to collection '{collection_name}'")

    if not text.strip():
        raise HTTPException(status_code=400, detail="テキストが空です")

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

        # ベクトルストアに追加
        vector_store = get_vector_store(collection_name)
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"テキストのアップロードに失敗しました: {str(e)}")


# === コレクション管理エンドポイント ===

@router.post("/collections/temp")
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
    try:
        manager = get_collection_manager()

        # コレクション名の決定
        if request.name:
            collection_name = request.name
        else:
            collection_name = manager.generate_temp_collection_name(request.prefix)

        # コレクション作成
        vector_store = manager.create_collection(
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

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating temp collection: {str(e)}")
        raise HTTPException(status_code=500, detail=f"一時コレクションの作成に失敗しました: {str(e)}")


@router.get("/collections")
async def list_collections(
    collection_type: Optional[CollectionType] = Query(default=None),
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
    try:
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

    except Exception as e:
        logger.error(f"Error listing collections: {str(e)}")
        raise HTTPException(status_code=500, detail=f"コレクション一覧の取得に失敗しました: {str(e)}")


@router.delete("/collections/{name}")
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
    try:
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting collection: {str(e)}")
        raise HTTPException(status_code=500, detail=f"コレクションの削除に失敗しました: {str(e)}")


@router.post("/collections/cleanup")
async def cleanup_expired_collections():
    """
    期限切れコレクションをクリーンアップ

    Returns:
        削除されたコレクション数
    """
    try:
        manager = get_collection_manager()
        deleted_count = manager.cleanup_expired()

        logger.info(f"Cleanup completed: {deleted_count} collections deleted")

        return JSONResponse(content={
            "success": True,
            "message": f"{deleted_count}個の期限切れコレクションを削除しました",
            "deleted_count": deleted_count
        })

    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        raise HTTPException(status_code=500, detail=f"クリーンアップに失敗しました: {str(e)}")
