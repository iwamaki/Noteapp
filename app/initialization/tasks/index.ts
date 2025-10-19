/**
 * @file index.ts
 * @summary 初期化タスクのエントリーポイント
 * @responsibility 全ての初期化タスクをエクスポートし、
 *                 一括登録できるタスク配列を提供します
 */

import { verifyAsyncStorageTask } from './verifyAsyncStorage';
import { loadSettingsTask } from './loadSettings';
import { InitializationTask } from '../types';

/**
 * 全ての初期化タスク
 *
 * この配列をAppInitializerに登録することで、
 * アプリケーションの初期化フローを定義します。
 */
export const allInitializationTasks: InitializationTask[] = [
  // Stage 1: CRITICAL
  verifyAsyncStorageTask,
  loadSettingsTask,

  // Stage 2: CORE
  // TODO: テーマ初期化タスクを追加

  // Stage 3: SERVICES
  // TODO: LLMサービス初期化タスクを追加

  // Stage 4: READY
  // TODO: 準備完了タスクを追加
];

// 個別エクスポート（オプション）
export { verifyAsyncStorageTask, loadSettingsTask };
