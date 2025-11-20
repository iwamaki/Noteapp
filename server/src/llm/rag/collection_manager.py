# @file collection_manager.py
# @summary コレクション管理クラス
# @responsibility 一時コレクションと永続コレクションの管理、TTL管理を行います

from typing import Dict, List, Optional, Literal
from pathlib import Path
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
import json
import shutil
from src.core.logger import logger
from src.llm.rag.vector_store import VectorStoreManager


CollectionType = Literal["temp", "persistent"]


class CollectionMetadata(BaseModel):
    """コレクションのメタデータ"""
    name: str
    type: CollectionType
    created_at: datetime
    expires_at: Optional[datetime] = None
    description: Optional[str] = None
    document_count: int = 0


class CollectionManager:
    """コレクションの作成、削除、TTL管理を行うマネージャークラス

    機能:
    - 一時コレクション（temp）と永続コレクション（persistent）の管理
    - TTLベースの自動クリーンアップ
    - VectorStoreManagerインスタンスのキャッシュ管理
    - メタデータの永続化
    """

    def __init__(self, base_storage_path: Optional[Path] = None):
        """コレクションマネージャーを初期化

        Args:
            base_storage_path: ベクトルストアの基本保存先パス
        """
        # ストレージパスの設定
        if base_storage_path is None:
            self.base_storage_path = (
                Path(__file__).parent.parent.parent.parent / "data" / "vector_stores"
            )
        else:
            self.base_storage_path = base_storage_path

        self.base_storage_path.mkdir(parents=True, exist_ok=True)

        # メタデータファイルのパス
        self.metadata_file = self.base_storage_path / "metadata.json"

        # VectorStoreManagerのキャッシュ
        self._vector_store_cache: Dict[str, VectorStoreManager] = {}

        # メタデータの読み込み
        self.metadata: Dict[str, CollectionMetadata] = {}
        self._load_metadata()

        logger.info(f"CollectionManager initialized: base_path={self.base_storage_path}")

    def _load_metadata(self) -> None:
        """メタデータファイルから情報を読み込む"""
        if not self.metadata_file.exists():
            logger.info("No metadata file found. Starting with empty metadata.")
            # デフォルトコレクションを作成
            self.metadata["default"] = CollectionMetadata(
                name="default",
                type="persistent",
                created_at=datetime.now(timezone.utc),
                description="Default knowledge base"
            )
            self._save_metadata()
            return

        try:
            with open(self.metadata_file, "r", encoding="utf-8") as f:
                data = json.load(f)

            # JSONからCollectionMetadataオブジェクトに変換
            self.metadata = {}
            for name, meta_dict in data.get("collections", {}).items():
                # datetimeの文字列をdatetimeオブジェクトに変換
                meta_dict["created_at"] = datetime.fromisoformat(meta_dict["created_at"])
                if meta_dict.get("expires_at"):
                    meta_dict["expires_at"] = datetime.fromisoformat(meta_dict["expires_at"])

                self.metadata[name] = CollectionMetadata(**meta_dict)

            logger.info(f"Loaded metadata for {len(self.metadata)} collections")

        except Exception as e:
            logger.error(f"Error loading metadata: {e}")
            self.metadata = {}

    def _save_metadata(self) -> None:
        """メタデータをファイルに保存"""
        try:
            # CollectionMetadataオブジェクトを辞書に変換
            data = {
                "collections": {
                    name: meta.model_dump(mode="json")
                    for name, meta in self.metadata.items()
                }
            }

            with open(self.metadata_file, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2, default=str)

            logger.debug(f"Metadata saved: {len(self.metadata)} collections")

        except Exception as e:
            logger.error(f"Error saving metadata: {e}")
            raise

    def create_collection(
        self,
        name: str,
        collection_type: CollectionType = "temp",
        ttl_hours: Optional[float] = 1.0,
        description: Optional[str] = None
    ) -> VectorStoreManager:
        """新しいコレクションを作成

        Args:
            name: コレクション名
            collection_type: コレクションタイプ（temp or persistent）
            ttl_hours: TTL（時間単位）。collection_type="temp"の場合のみ有効
            description: コレクションの説明

        Returns:
            作成されたVectorStoreManager

        Raises:
            ValueError: コレクション名が既に存在する場合
        """
        if name in self.metadata:
            raise ValueError(f"Collection '{name}' already exists")

        # メタデータを作成
        created_at = datetime.now(timezone.utc)
        expires_at = None

        if collection_type == "temp" and ttl_hours is not None:
            expires_at = created_at + timedelta(hours=ttl_hours)

        metadata = CollectionMetadata(
            name=name,
            type=collection_type,
            created_at=created_at,
            expires_at=expires_at,
            description=description
        )

        # メタデータを保存
        self.metadata[name] = metadata
        self._save_metadata()

        # VectorStoreManagerを作成
        storage_path = self.base_storage_path / name
        vector_store = VectorStoreManager(
            storage_path=str(storage_path),
            collection_name=name
        )

        # キャッシュに追加
        self._vector_store_cache[name] = vector_store

        logger.info(
            f"Collection created: name={name}, type={collection_type}, "
            f"ttl_hours={ttl_hours}, expires_at={expires_at}"
        )

        return vector_store

    def get_collection(self, name: str) -> Optional[VectorStoreManager]:
        """コレクションを取得

        Args:
            name: コレクション名

        Returns:
            VectorStoreManager、存在しない場合はNone
        """
        # メタデータをリロード（他のプロセスでの変更を反映）
        self._load_metadata()

        # メタデータが存在しない場合
        if name not in self.metadata:
            logger.warning(f"Collection '{name}' not found in metadata")
            return None

        # 期限切れチェック
        metadata = self.metadata[name]
        if metadata.expires_at and datetime.now(timezone.utc) > metadata.expires_at:
            logger.warning(f"Collection '{name}' has expired. Cleaning up...")
            self.delete_collection(name)
            return None

        # キャッシュから取得
        if name in self._vector_store_cache:
            return self._vector_store_cache[name]

        # キャッシュにない場合は新規作成
        storage_path = self.base_storage_path / name
        if not storage_path.exists():
            logger.warning(f"Collection storage path not found: {storage_path}")
            return None

        vector_store = VectorStoreManager(
            storage_path=str(storage_path),
            collection_name=name
        )

        # キャッシュに追加
        self._vector_store_cache[name] = vector_store

        return vector_store

    def delete_collection(self, name: str) -> bool:
        """コレクションを削除

        Args:
            name: コレクション名

        Returns:
            削除成功の場合True
        """
        # デフォルトコレクションは削除できない
        if name == "default":
            logger.warning("Cannot delete default collection")
            return False

        # メタデータから削除
        if name in self.metadata:
            del self.metadata[name]
            self._save_metadata()

        # キャッシュから削除
        if name in self._vector_store_cache:
            del self._vector_store_cache[name]

        # ストレージから削除
        storage_path = self.base_storage_path / name
        if storage_path.exists():
            try:
                shutil.rmtree(storage_path)
                logger.info(f"Collection deleted: {name}")
                return True
            except Exception as e:
                logger.error(f"Error deleting collection storage: {e}")
                return False

        return True

    def list_collections(
        self,
        collection_type: Optional[CollectionType] = None,
        include_expired: bool = False
    ) -> List[CollectionMetadata]:
        """コレクション一覧を取得

        Args:
            collection_type: フィルタするコレクションタイプ（None の場合は全て）
            include_expired: 期限切れコレクションを含めるか

        Returns:
            CollectionMetadataのリスト
        """
        now = datetime.now(timezone.utc)
        result = []

        for metadata in self.metadata.values():
            # タイプフィルタ
            if collection_type and metadata.type != collection_type:
                continue

            # 期限切れフィルタ
            if not include_expired and metadata.expires_at and now > metadata.expires_at:
                continue

            # ドキュメント数を更新
            vector_store = self.get_collection(metadata.name)
            if vector_store:
                stats = vector_store.get_stats()
                metadata.document_count = stats["document_count"]

            result.append(metadata)

        return result

    def get_metadata(self, name: str) -> Optional[CollectionMetadata]:
        """コレクションのメタデータを取得

        Args:
            name: コレクション名

        Returns:
            CollectionMetadata、存在しない場合はNone
        """
        return self.metadata.get(name)

    def cleanup_expired(self) -> int:
        """期限切れコレクションを削除

        Returns:
            削除されたコレクション数
        """
        now = datetime.now(timezone.utc)
        expired_collections = []

        for name, metadata in self.metadata.items():
            if metadata.expires_at and now > metadata.expires_at:
                expired_collections.append(name)

        deleted_count = 0
        for name in expired_collections:
            if self.delete_collection(name):
                deleted_count += 1

        if deleted_count > 0:
            logger.info(f"Cleaned up {deleted_count} expired collections")

        return deleted_count

    def generate_temp_collection_name(self, prefix: str = "temp") -> str:
        """一時コレクション用のユニークな名前を生成

        Args:
            prefix: プレフィックス（例: "web", "frontend"）

        Returns:
            生成されたコレクション名
        """
        timestamp = int(datetime.now(timezone.utc).timestamp())
        base_name = f"{prefix}_{timestamp}"

        # 重複チェック（念のため）
        counter = 0
        name = base_name
        while name in self.metadata:
            counter += 1
            name = f"{base_name}_{counter}"

        return name
