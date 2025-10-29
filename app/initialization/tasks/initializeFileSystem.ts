/**
 * @file initializeFileSystem.ts
 * @summary FileSystem初期化タスク
 * @responsibility Expo FileSystemのディレクトリ構造を初期化します（CRITICAL優先度）
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { initializeFileSystemFlat } from '../../data/repositories/fileRepository';

/**
 * FileSystem初期化タスク (Flat)
 *
 * アプリケーションで使用するFlat FileSystemのディレクトリ構造を作成します。
 * noteapp/content/ を作成し、フラットなディレクトリ構造を初期化します。
 */
export const initializeFileSystemTask: InitializationTask = {
  id: 'initialize-file-system',
  name: 'FileSystem初期化 (Flat)',
  description: 'Flat FileSystemのディレクトリ構造を初期化します',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.CRITICAL,
  dependencies: [], // AsyncStorageの後に実行されるが、明示的な依存はなし

  execute: async () => {
    // Flat FileSystemのディレクトリ構造を初期化
    await initializeFileSystemFlat();
  },

  retry: {
    maxAttempts: 3,
    delayMs: 500,
  },

  timeout: 10000, // 10秒
};
