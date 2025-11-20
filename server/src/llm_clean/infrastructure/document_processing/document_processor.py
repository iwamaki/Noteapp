# @file document_processor.py
# @summary ドキュメントの読み込み、分割、処理を行うクラス
# @responsibility 各種フォーマットのドキュメントをLangChain Documentに変換します

from datetime import datetime
from pathlib import Path
from typing import Any

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.core.logger import logger


class DocumentProcessor:
    """ドキュメントの読み込みと処理を行うクラス

    機能:
    - テキストファイル(.txt, .md, .py, など)の読み込み
    - PDFファイル(.pdf)の読み込み
    - ドキュメントのチャンク分割
    - メタデータの付与
    """

    def __init__(
        self,
        chunk_size: int = 1000,
        chunk_overlap: int = 200
    ):
        """ドキュメントプロセッサを初期化

        Args:
            chunk_size: テキスト分割時のチャンクサイズ（文字数）
            chunk_overlap: チャンク間のオーバーラップ（文字数）
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

        # テキストスプリッターの初期化
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", "。", ".", " ", ""]
        )

        logger.info(
            f"DocumentProcessor initialized: "
            f"chunk_size={chunk_size}, chunk_overlap={chunk_overlap}"
        )

    def load_from_text(
        self,
        text: str,
        metadata: dict[str, Any] | None = None
    ) -> list[Document]:
        """テキストからドキュメントを作成

        Args:
            text: 処理するテキスト
            metadata: 付与するメタデータ

        Returns:
            分割されたドキュメントのリスト
        """
        if not text.strip():
            logger.warning("Empty text provided")
            return []

        # メタデータのデフォルト値
        doc_metadata = metadata or {}
        doc_metadata.setdefault("source", "text_input")
        doc_metadata.setdefault("created_at", datetime.now().isoformat())

        try:
            # ドキュメント作成
            doc = Document(page_content=text, metadata=doc_metadata)

            # チャンクに分割
            chunks = self.text_splitter.split_documents([doc])

            # 各チャンクにチャンク番号を追加
            for i, chunk in enumerate(chunks):
                chunk.metadata["chunk_index"] = i
                chunk.metadata["total_chunks"] = len(chunks)

            logger.info(f"Processed text into {len(chunks)} chunks")
            return chunks

        except Exception as e:
            logger.error(f"Error processing text: {e}")
            raise

    def load_from_file(
        self,
        file_path: str,
        additional_metadata: dict[str, Any] | None = None
    ) -> list[Document]:
        """ファイルからドキュメントを読み込み

        Args:
            file_path: ファイルパス
            additional_metadata: 追加するメタデータ

        Returns:
            分割されたドキュメントのリスト
        """
        path = Path(file_path)

        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        file_extension = path.suffix.lower()

        # ファイルタイプに応じて処理
        try:
            if file_extension == ".pdf":
                documents = self._load_pdf(file_path)
            elif file_extension in [".txt", ".md", ".py", ".js", ".java", ".cpp", ".html", ".css", ".json"]:
                documents = self._load_text_file(file_path)
            else:
                # デフォルトでテキストとして読み込みを試みる
                logger.warning(f"Unknown file type: {file_extension}. Trying as text file.")
                documents = self._load_text_file(file_path)

            # 追加メタデータを付与
            if additional_metadata:
                for doc in documents:
                    doc.metadata.update(additional_metadata)

            # 共通メタデータを付与
            for doc in documents:
                doc.metadata.setdefault("file_name", path.name)
                doc.metadata.setdefault("file_path", str(path.absolute()))
                doc.metadata.setdefault("file_type", file_extension)
                doc.metadata.setdefault("loaded_at", datetime.now().isoformat())

            # チャンクに分割
            chunks = self.text_splitter.split_documents(documents)

            # 各チャンクにチャンク番号を追加
            for i, chunk in enumerate(chunks):
                chunk.metadata["chunk_index"] = i
                chunk.metadata["total_chunks"] = len(chunks)

            logger.info(
                f"Loaded and processed file: {path.name} "
                f"({len(documents)} pages/sections -> {len(chunks)} chunks)"
            )

            return chunks

        except Exception as e:
            logger.error(f"Error loading file {file_path}: {e}")
            raise

    def _load_text_file(self, file_path: str) -> list[Document]:
        """テキストファイルを読み込み

        Args:
            file_path: ファイルパス

        Returns:
            ドキュメントのリスト
        """
        try:
            loader = TextLoader(file_path, encoding="utf-8")
            return loader.load()
        except UnicodeDecodeError:
            # UTF-8で失敗した場合、他のエンコーディングを試す
            logger.warning(f"UTF-8 decoding failed for {file_path}, trying other encodings")
            for encoding in ["cp932", "shift-jis", "euc-jp", "latin-1"]:
                try:
                    loader = TextLoader(file_path, encoding=encoding)
                    return loader.load()
                except UnicodeDecodeError:
                    continue
            raise ValueError(f"Failed to decode file {file_path} with any known encoding")

    def _load_pdf(self, file_path: str) -> list[Document]:
        """PDFファイルを読み込み

        Args:
            file_path: ファイルパス

        Returns:
            ドキュメントのリスト（ページごと）
        """
        loader = PyPDFLoader(file_path)
        documents = loader.load()

        # 各ページにページ番号を追加
        for i, doc in enumerate(documents):
            doc.metadata["page_number"] = i + 1

        return documents

    def process_multiple_files(
        self,
        file_paths: list[str],
        additional_metadata: dict[str, Any] | None = None
    ) -> list[Document]:
        """複数のファイルを一括処理

        Args:
            file_paths: ファイルパスのリスト
            additional_metadata: 追加するメタデータ

        Returns:
            全ファイルの分割されたドキュメントのリスト
        """
        all_chunks = []

        for file_path in file_paths:
            try:
                chunks = self.load_from_file(file_path, additional_metadata)
                all_chunks.extend(chunks)
            except Exception as e:
                logger.error(f"Failed to process file {file_path}: {e}")
                # エラーがあっても続行

        logger.info(
            f"Processed {len(file_paths)} files into {len(all_chunks)} total chunks"
        )

        return all_chunks

    def get_document_summary(self, documents: list[Document]) -> dict[str, Any]:
        """ドキュメントの統計情報を取得

        Args:
            documents: ドキュメントのリスト

        Returns:
            統計情報の辞書
        """
        if not documents:
            return {
                "total_documents": 0,
                "total_characters": 0,
                "average_chunk_size": 0
            }

        total_chars = sum(len(doc.page_content) for doc in documents)
        avg_size = total_chars / len(documents) if documents else 0

        return {
            "total_documents": len(documents),
            "total_characters": total_chars,
            "average_chunk_size": int(avg_size)
        }
