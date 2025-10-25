/**
 * @file migrateData.ts
 * @summary データ移行タスク
 * @responsibility AsyncStorage から FileSystem へデータを移行します（CRITICAL優先度）
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import {
  checkMigrationStatus,
  migrateAsyncStorageToFileSystem,
} from '../../data/migrationUtils';

/**
 * データ移行タスク
 *
 * AsyncStorage に保存されている既存のファイル・フォルダ・バージョンデータを
 * FileSystem へ移行します。移行は一度だけ実行され、完了フラグが立っている場合はスキップされます。
 *
 * 依存関係:
 * - initialize-file-system: FileSystem のディレクトリ構造が初期化されている必要があります
 *
 * 安全性:
 * - 移行前に自動バックアップを作成
 * - エラー時は自動的にロールバック
 * - 完了フラグが立つまで AsyncStorage から読み込み続ける
 */
export const migrateDataTask: InitializationTask = {
  id: 'migrate-data',
  name: 'データ移行',
  description: 'AsyncStorage から FileSystem へデータを移行します',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.CRITICAL,
  dependencies: ['initialize-file-system'], // FileSystem 初期化後に実行

  execute: async () => {
    // 移行状態をチェック
    const status = await checkMigrationStatus();

    if (status.completed) {
      console.log(
        `[MigrateData] Migration already completed at ${status.completedAt}, skipping...`
      );
      return;
    }

    // 移行実行
    console.log('[MigrateData] Starting data migration from AsyncStorage to FileSystem...');

    const result = await migrateAsyncStorageToFileSystem((progress) => {
      console.log(
        `[MigrateData] ${progress.stage}: ${progress.percent}% - ${progress.message}`
      );
    });

    if (!result.success) {
      throw result.error || new Error('Migration failed for unknown reason');
    }

    console.log(
      `[MigrateData] Migration completed successfully: ${result.filesCount} files, ${result.foldersCount} folders, ${result.versionsCount} versions in ${result.duration}ms`
    );
  },

  retry: {
    maxAttempts: 1, // 移行は1回のみ試行（失敗したら手動対応が必要）
    delayMs: 0,
  },

  timeout: 300000, // 5分（大量データの場合を考慮）
};
