# @file knowledge_base_router.py
# @summary 知識ベース（RAG）管理用のAPIエンドポイント
# @responsibility ドキュメントのアップロード、統計情報取得、削除を提供します

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional
import tempfile
import shutil
from pathlib import Path

from src.llm.rag.vector_store import VectorStoreManager
from src.llm.rag.document_processor import DocumentProcessor
from src.core.logger import logger

router = APIRouter()

# グローバルなインスタンス
_vector_store: Optional[VectorStoreManager] = None
_document_processor: Optional[DocumentProcessor] = None


def get_vector_store() -> VectorStoreManager:
    """ベクトルストアのシングルトンインスタンスを取得"""
    global _vector_store
    if _vector_store is None:
        _vector_store = VectorStoreManager(collection_name="default")
    return _vector_store


def get_document_processor() -> DocumentProcessor:
    """ドキュメントプロセッサのシングルトンインスタンスを取得"""
    global _document_processor
    if _document_processor is None:
        _document_processor = DocumentProcessor(
            chunk_size=1000,
            chunk_overlap=200
        )
    return _document_processor


@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    metadata_title: Optional[str] = None,
    metadata_description: Optional[str] = None
):
    """
    ドキュメントをアップロードして知識ベースに追加

    Args:
        file: アップロードするファイル（PDF, TXT, MD, など）
        metadata_title: ドキュメントのタイトル（オプション）
        metadata_description: ドキュメントの説明（オプション）

    Returns:
        アップロード結果とドキュメント情報
    """
    logger.info(f"Document upload requested: {file.filename}")

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
        vector_store = get_vector_store()
        vector_store.add_documents(chunks, save_after_add=True)

        # 統計情報を取得
        stats = vector_store.get_stats()
        doc_summary = processor.get_document_summary(chunks)

        logger.info(
            f"Document uploaded successfully: {file.filename} "
            f"({len(chunks)} chunks, {doc_summary['total_characters']} chars)"
        )

        return JSONResponse(content={
            "success": True,
            "message": f"ドキュメント '{file.filename}' を知識ベースに追加しました",
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

    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(status_code=500, detail=f"ドキュメントのアップロードに失敗しました: {str(e)}")

    finally:
        # 一時ファイルを削除
        if temp_file_path and Path(temp_file_path).exists():
            Path(temp_file_path).unlink()


@router.get("/documents/stats")
async def get_knowledge_base_stats():
    """
    知識ベースの統計情報を取得

    Returns:
        ドキュメント数、ストレージパスなどの統計情報
    """
    try:
        vector_store = get_vector_store()
        stats = vector_store.get_stats()

        return JSONResponse(content={
            "success": True,
            "stats": stats
        })

    except Exception as e:
        logger.error(f"Error getting knowledge base stats: {str(e)}")
        raise HTTPException(status_code=500, detail=f"統計情報の取得に失敗しました: {str(e)}")


@router.delete("/documents/clear")
async def clear_knowledge_base():
    """
    知識ベースをクリア（全ドキュメントを削除）

    Returns:
        削除結果
    """
    try:
        vector_store = get_vector_store()
        vector_store.clear()

        logger.info("Knowledge base cleared")

        return JSONResponse(content={
            "success": True,
            "message": "知識ベースをクリアしました"
        })

    except Exception as e:
        logger.error(f"Error clearing knowledge base: {str(e)}")
        raise HTTPException(status_code=500, detail=f"知識ベースのクリアに失敗しました: {str(e)}")


@router.post("/documents/upload-text")
async def upload_text(
    text: str,
    metadata_title: Optional[str] = None,
    metadata_description: Optional[str] = None
):
    """
    テキストを直接アップロードして知識ベースに追加

    Args:
        text: アップロードするテキスト
        metadata_title: ドキュメントのタイトル（オプション）
        metadata_description: ドキュメントの説明（オプション）

    Returns:
        アップロード結果とドキュメント情報
    """
    logger.info(f"Text upload requested: {len(text)} characters")

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
        vector_store = get_vector_store()
        vector_store.add_documents(chunks, save_after_add=True)

        # 統計情報を取得
        stats = vector_store.get_stats()
        doc_summary = processor.get_document_summary(chunks)

        logger.info(
            f"Text uploaded successfully: {len(chunks)} chunks, {doc_summary['total_characters']} chars"
        )

        return JSONResponse(content={
            "success": True,
            "message": "テキストを知識ベースに追加しました",
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

    except Exception as e:
        logger.error(f"Error uploading text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"テキストのアップロードに失敗しました: {str(e)}")
