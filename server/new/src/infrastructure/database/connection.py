"""
@file connection.py
@summary データベース接続とセッション管理
@responsibility データベースエンジンの作成、セッションファクトリー、依存注入用のセッション取得
"""

from collections.abc import AsyncGenerator, Generator
from contextlib import contextmanager

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from .base import Base


class DatabaseConfig:
    """データベース設定

    環境に応じたデータベースURLとエンジン設定を提供する。
    """

    def __init__(
        self,
        database_url: str,
        echo: bool = False,
        pool_size: int = 10,
        max_overflow: int = 20,
        pool_recycle: int = 3600,
    ):
        """
        Args:
            database_url: データベース接続URL
            echo: SQLログ出力を有効化（デバッグ用）
            pool_size: コネクションプールサイズ
            max_overflow: プールサイズを超えた際の最大接続数
            pool_recycle: 接続の再利用時間（秒）
        """
        self.database_url = database_url
        self.echo = echo
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.pool_recycle = pool_recycle

        # SQLiteの判定
        self.is_sqlite = database_url.startswith("sqlite")
        self.is_async = "asyncpg" in database_url or "aiosqlite" in database_url


class DatabaseManager:
    """データベース接続マネージャー

    同期・非同期両方のエンジンとセッションを管理する。
    """

    def __init__(self, config: DatabaseConfig):
        """
        Args:
            config: データベース設定
        """
        self.config = config
        self._engine: Engine | None = None
        self._async_engine = None
        self._session_factory: sessionmaker | None = None
        self._async_session_factory: async_sessionmaker | None = None

    @property
    def engine(self) -> Engine:
        """同期エンジンを取得（遅延初期化）"""
        if self._engine is None:
            self._engine = self._create_engine()
        return self._engine

    @property
    def async_engine(self):
        """非同期エンジンを取得（遅延初期化）"""
        if self._async_engine is None:
            self._async_engine = self._create_async_engine()
        return self._async_engine

    @property
    def session_factory(self) -> sessionmaker:
        """同期セッションファクトリーを取得"""
        if self._session_factory is None:
            self._session_factory = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine,
            )
        return self._session_factory

    @property
    def async_session_factory(self) -> async_sessionmaker:
        """非同期セッションファクトリーを取得"""
        if self._async_session_factory is None:
            self._async_session_factory = async_sessionmaker(
                self.async_engine,
                class_=AsyncSession,
                expire_on_commit=False,
            )
        return self._async_session_factory

    def _create_engine(self) -> Engine:
        """同期エンジンを作成"""
        if self.config.is_sqlite:
            # SQLite用設定
            engine = create_engine(
                self.config.database_url,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,  # SQLiteはStaticPoolを使用
                echo=self.config.echo,
            )

            # SQLiteの場合、外部キー制約を有効化
            @event.listens_for(engine, "connect")
            def set_sqlite_pragma(dbapi_conn, connection_record):
                cursor = dbapi_conn.cursor()
                cursor.execute("PRAGMA foreign_keys=ON")
                cursor.close()
        else:
            # PostgreSQL等の設定
            engine = create_engine(
                self.config.database_url,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_recycle=self.config.pool_recycle,
                echo=self.config.echo,
            )

        return engine

    def _create_async_engine(self):
        """非同期エンジンを作成"""
        if self.config.is_sqlite:
            # SQLite用の非同期エンジン（aiosqlite）
            return create_async_engine(
                self.config.database_url.replace("sqlite://", "sqlite+aiosqlite://"),
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
                echo=self.config.echo,
            )
        else:
            # PostgreSQL用の非同期エンジン（asyncpg）
            async_url = self.config.database_url
            if "asyncpg" not in async_url:
                async_url = async_url.replace("postgresql://", "postgresql+asyncpg://")

            return create_async_engine(
                async_url,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_recycle=self.config.pool_recycle,
                echo=self.config.echo,
            )

    def create_tables(self) -> None:
        """すべてのテーブルを作成"""
        Base.metadata.create_all(bind=self.engine)

    async def create_tables_async(self) -> None:
        """すべてのテーブルを作成（非同期）"""
        async with self.async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    def drop_tables(self) -> None:
        """すべてのテーブルを削除（テスト用）"""
        Base.metadata.drop_all(bind=self.engine)

    async def drop_tables_async(self) -> None:
        """すべてのテーブルを削除（非同期、テスト用）"""
        async with self.async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)

    @contextmanager
    def get_session(self) -> Generator[Session, None, None]:
        """同期セッションを取得（コンテキストマネージャー）

        Yields:
            Session: SQLAlchemyセッション
        """
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        """非同期セッションを取得（非同期コンテキストマネージャー）

        Yields:
            AsyncSession: 非同期SQLAlchemyセッション
        """
        async with self.async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    def close(self) -> None:
        """エンジンをクローズ"""
        if self._engine:
            self._engine.dispose()
        if self._async_engine:
            # 非同期エンジンは同期的にdisposeできない
            pass


# ==========================================
# グローバルデータベースマネージャー（後で設定から初期化）
# ==========================================
_db_manager: DatabaseManager | None = None


def init_database(database_url: str, **kwargs) -> DatabaseManager:
    """データベースマネージャーを初期化

    Args:
        database_url: データベース接続URL
        **kwargs: DatabaseConfigに渡す追加パラメータ

    Returns:
        DatabaseManager: 初期化されたデータベースマネージャー
    """
    global _db_manager
    config = DatabaseConfig(database_url, **kwargs)
    _db_manager = DatabaseManager(config)
    return _db_manager


def get_db_manager() -> DatabaseManager:
    """データベースマネージャーを取得

    Returns:
        DatabaseManager: データベースマネージャー

    Raises:
        RuntimeError: データベースが初期化されていない場合
    """
    if _db_manager is None:
        raise RuntimeError(
            "Database not initialized. Call init_database() first."
        )
    return _db_manager


def get_db() -> Generator[Session, None, None]:
    """DBセッションを取得（FastAPI Depends用）

    FastAPIのDependencyとして使用される。
    リクエストごとに新しいセッションを作成し、
    リクエスト終了時に自動的にクローズする。

    Yields:
        Session: SQLAlchemyセッション
    """
    db_manager = get_db_manager()
    session = db_manager.session_factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """非同期DBセッションを取得（FastAPI Depends用）

    FastAPIのDependencyとして使用される。
    リクエストごとに新しいセッションを作成し、
    リクエスト終了時に自動的にクローズする。

    Yields:
        AsyncSession: 非同期SQLAlchemyセッション
    """
    db_manager = get_db_manager()
    async with db_manager.async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
