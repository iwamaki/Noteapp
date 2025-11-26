# @file pgvector_cleanup_job.py
# @summary PostgreSQL版TTL期限切れドキュメントの自動クリーンアップジョブ
# @responsibility 定期的に期限切れドキュメントを削除します

import asyncio

from src.core.logger import logger
from src.data import SessionLocal

from .pgvector_store import PgVectorStore


class PgVectorCleanupJob:
    """期限切れドキュメントを定期的にクリーンアップするバックグラウンドジョブ

    機能:
    - 指定間隔（デフォルト: 10分）で期限切れドキュメントをチェック
    - 期限切れドキュメントを自動削除
    - 起動時にも1回実行
    """

    def __init__(self, interval_minutes: int = 10):
        """クリーンアップジョブを初期化

        Args:
            interval_minutes: クリーンアップ実行間隔（分単位、デフォルト: 10）
        """
        self.interval_minutes = interval_minutes
        self.task: asyncio.Task | None = None
        self._running = False

        logger.info(
            f"PgVectorCleanupJob initialized: interval={interval_minutes} minutes",
            extra={"category": "vectorstore"}
        )

    async def start(self) -> None:
        """クリーンアップジョブを開始"""
        if self._running:
            logger.warning("PgVectorCleanupJob is already running", extra={"category": "vectorstore"})
            return

        self._running = True
        logger.info("PgVectorCleanupJob started", extra={"category": "vectorstore"})

        # 起動時に1回実行
        await self._cleanup()

        # 定期実行タスクを開始
        self.task = asyncio.create_task(self._run_periodic())

    async def stop(self) -> None:
        """クリーンアップジョブを停止"""
        if not self._running:
            return

        self._running = False
        logger.info("Stopping PgVectorCleanupJob...", extra={"category": "vectorstore"})

        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                logger.info("PgVectorCleanupJob stopped", extra={"category": "vectorstore"})

    async def _run_periodic(self) -> None:
        """定期的にクリーンアップを実行"""
        while self._running:
            try:
                # 指定間隔待機
                await asyncio.sleep(self.interval_minutes * 60)

                # クリーンアップ実行
                if self._running:
                    await self._cleanup()

            except asyncio.CancelledError:
                logger.info("PgVectorCleanupJob periodic task cancelled", extra={"category": "vectorstore"})
                break
            except Exception as e:
                logger.error(
                    f"Error in PgVectorCleanupJob periodic task: {e}",
                    extra={"category": "vectorstore"}
                )
                # エラーが発生してもジョブは継続

    async def _cleanup(self) -> None:
        """期限切れドキュメントをクリーンアップ"""
        db = SessionLocal()
        try:
            logger.info("Running pgvector cleanup job...", extra={"category": "vectorstore"})

            store = PgVectorStore(db)
            deleted_count = await store.cleanup_expired()

            if deleted_count > 0:
                logger.info(
                    f"Cleanup completed: {deleted_count} documents deleted",
                    extra={"category": "vectorstore"}
                )
            else:
                logger.debug(
                    "Cleanup completed: no expired documents",
                    extra={"category": "vectorstore"}
                )

        except Exception as e:
            logger.error(f"Error during cleanup: {e}", extra={"category": "vectorstore"})
        finally:
            db.close()


# グローバルなクリーンアップジョブインスタンス
_pgvector_cleanup_job: PgVectorCleanupJob | None = None


async def start_pgvector_cleanup_job(interval_minutes: int = 10) -> PgVectorCleanupJob:
    """PostgreSQL版クリーンアップジョブを開始

    Args:
        interval_minutes: クリーンアップ実行間隔（分単位、デフォルト: 10）

    Returns:
        PgVectorCleanupJobインスタンス
    """
    global _pgvector_cleanup_job

    if _pgvector_cleanup_job is not None:
        logger.warning(
            "PgVectorCleanupJob already exists. Stopping previous job...",
            extra={"category": "vectorstore"}
        )
        await _pgvector_cleanup_job.stop()

    _pgvector_cleanup_job = PgVectorCleanupJob(interval_minutes)
    await _pgvector_cleanup_job.start()

    return _pgvector_cleanup_job


async def stop_pgvector_cleanup_job() -> None:
    """PostgreSQL版クリーンアップジョブを停止"""
    global _pgvector_cleanup_job

    if _pgvector_cleanup_job is not None:
        await _pgvector_cleanup_job.stop()
        _pgvector_cleanup_job = None
