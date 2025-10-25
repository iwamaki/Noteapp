/**
 * @file initializeFileSystem.ts
 * @summary FileSystem初期化タスク
 * @responsibility Expo FileSystemのディレクトリ構造を初期化します（CRITICAL優先度）
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { initializeFileSystem } from '../../data/fileSystemUtils';

/**
 * FileSystem初期化タスク
 *
 * アプリケーションで使用するFileSystemのディレクトリ構造を作成します。
 * noteapp/metadata/, noteapp/contents/, noteapp/version-contents/ を作成し、
 * 必要なメタデータファイル（files.json, folders.json, versions-meta.json）を初期化します。
 */
export const initializeFileSystemTask: InitializationTask = {
  id: 'initialize-file-system',
  name: 'FileSystem初期化',
  description: 'FileSystemのディレクトリ構造とメタデータファイルを初期化します',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.CRITICAL,
  dependencies: [], // AsyncStorageの後に実行されるが、明示的な依存はなし

  execute: async () => {
    // FileSystemのディレクトリ構造を初期化
    await initializeFileSystem();
  },

  retry: {
    maxAttempts: 3,
    delayMs: 500,
  },

  timeout: 10000, // 10秒
};
