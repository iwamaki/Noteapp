/**
 * @file initializeFileSystem.ts
 * @summary FileSystem初期化タスク
 * @responsibility Expo FileSystemのディレクトリ構造を初期化します（CRITICAL優先度）
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { initializeFileSystemV2 } from '../../data/infrastructure/fileSystemUtilsV2';

/**
 * FileSystem初期化タスク (V2)
 *
 * アプリケーションで使用するV2 FileSystemのディレクトリ構造を作成します。
 * noteapp/content/root/ を作成し、階層的ディレクトリ構造を初期化します。
 */
export const initializeFileSystemTask: InitializationTask = {
  id: 'initialize-file-system',
  name: 'FileSystem初期化 (V2)',
  description: 'V2 FileSystemの階層的ディレクトリ構造を初期化します',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.CRITICAL,
  dependencies: [], // AsyncStorageの後に実行されるが、明示的な依存はなし

  execute: async () => {
    // V2 FileSystemのディレクトリ構造を初期化
    await initializeFileSystemV2();
  },

  retry: {
    maxAttempts: 3,
    delayMs: 500,
  },

  timeout: 10000, // 10秒
};
