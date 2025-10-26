/**
 * @file migrateToV2.ts
 * @summary V2データ移行タスク
 * @responsibility V1（フラット構造）からV2（階層構造）へデータを移行します（CRITICAL優先度）
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import {
  checkMigrationStatusV2,
  migrateV1ToV2,
} from '../../data/migrationUtilsV2';

/**
 * V2データ移行タスク
 *
 * Issue 004で実装されたフラットなメタデータJSON構造から、
 * expo-file-systemの階層的なディレクトリ構造への移行を実行します。
 *
 * 主な変更点:
 * - pathフィールドの削除
 * - slugベースのディレクトリ命名
 * - .folder.json / meta.json の分散配置
 *
 * 依存関係:
 * - migrate-data: V1のFileSystem移行が完了している必要があります
 *
 * 安全性:
 * - 移行前にV1データを自動バックアップ
 * - エラー時は自動的にロールバック
 * - 完了フラグが立つまでV1データから読み込み続ける
 */
export const migrateToV2Task: InitializationTask = {
  id: 'migrate-to-v2',
  name: 'V2構造への移行',
  description: 'フラット構造から階層的ディレクトリ構造へ移行します',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.CRITICAL,
  dependencies: ['migrate-data'], // V1移行の後に実行

  execute: async () => {
    // 移行状態をチェック
    const status = await checkMigrationStatusV2();

    if (status.completed) {
      console.log(
        `[MigrateToV2] Migration already completed at ${status.completedAt}, skipping...`
      );
      return;
    }

    // 移行実行
    console.log('[MigrateToV2] Starting data migration from V1 to V2...');

    const result = await migrateV1ToV2((progress) => {
      console.log(
        `[MigrateToV2] ${progress.stage}: ${progress.percent}% - ${progress.message}`
      );
    });

    if (!result.success) {
      throw result.error || new Error('V2 migration failed for unknown reason');
    }

    console.log(
      `[MigrateToV2] Migration completed successfully: ${result.filesCount} files, ${result.foldersCount} folders, ${result.versionsCount} versions in ${result.duration}ms`
    );
  },

  retry: {
    maxAttempts: 1, // 移行は1回のみ試行（失敗したら手動対応が必要）
    delayMs: 0,
  },

  timeout: 300000, // 5分（大量データの場合を考慮）
};
