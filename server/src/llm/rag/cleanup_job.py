# @file cleanup_job.py
# @summary TTL期限切れコレクションの自動クリーンアップジョブ
# @responsibility 定期的に期限切れコレクションを削除します

import asyncio
from typing import Optional
from src.core.logger import logger
from src.llm.rag.collection_manager import CollectionManager


class CleanupJob:
    """期限切れコレクションを定期的にクリーンアップするバックグラウンドジョブ

    機能:
    - 指定間隔（デフォルト: 10分）で期限切れコレクションをチェック
    - 期限切れコレクションを自動削除
    - 起動時にも1回実行
    """

    def __init__(
        self,
        collection_manager: CollectionManager,
        interval_minutes: int = 10
    ):
        """クリーンアップジョブを初期化

        Args:
            collection_manager: コレクションマネージャー
            interval_minutes: クリーンアップ実行間隔（分単位、デフォルト: 10）
        """
        self.collection_manager = collection_manager
        self.interval_minutes = interval_minutes
        self.task: Optional[asyncio.Task] = None
        self._running = False

        logger.info(f"CleanupJob initialized: interval={interval_minutes} minutes")

    async def start(self) -> None:
        """クリーンアップジョブを開始"""
        if self._running:
            logger.warning("CleanupJob is already running")
            return

        self._running = True
        logger.info("CleanupJob started")

        # 起動時に1回実行
        await self._cleanup()

        # 定期実行タスクを開始
        self.task = asyncio.create_task(self._run_periodic())

    async def stop(self) -> None:
        """クリーンアップジョブを停止"""
        if not self._running:
            return

        self._running = False
        logger.info("Stopping CleanupJob...")

        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                logger.info("CleanupJob stopped")

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
                logger.info("CleanupJob periodic task cancelled")
                break
            except Exception as e:
                logger.error(f"Error in CleanupJob periodic task: {e}")
                # エラーが発生してもジョブは継続

    async def _cleanup(self) -> None:
        """期限切れコレクションをクリーンアップ"""
        try:
            logger.info("Running cleanup job...")
            deleted_count = self.collection_manager.cleanup_expired()

            if deleted_count > 0:
                logger.info(f"Cleanup completed: {deleted_count} collections deleted")
            else:
                logger.debug("Cleanup completed: no expired collections")

        except Exception as e:
            logger.error(f"Error during cleanup: {e}")


# グローバルなクリーンアップジョブインスタンス
_cleanup_job: Optional[CleanupJob] = None


async def start_cleanup_job(
    collection_manager: CollectionManager,
    interval_minutes: int = 10
) -> CleanupJob:
    """クリーンアップジョブを開始

    Args:
        collection_manager: コレクションマネージャー
        interval_minutes: クリーンアップ実行間隔（分単位、デフォルト: 10）

    Returns:
        CleanupJobインスタンス
    """
    global _cleanup_job

    if _cleanup_job is not None:
        logger.warning("CleanupJob already exists. Stopping previous job...")
        await _cleanup_job.stop()

    _cleanup_job = CleanupJob(collection_manager, interval_minutes)
    await _cleanup_job.start()

    return _cleanup_job


async def stop_cleanup_job() -> None:
    """クリーンアップジョブを停止"""
    global _cleanup_job

    if _cleanup_job is not None:
        await _cleanup_job.stop()
        _cleanup_job = None
