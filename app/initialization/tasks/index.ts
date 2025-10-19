/**
 * @file index.ts
 * @summary 初期化タスクのエントリーポイント
 * @responsibility 全ての初期化タスクをエクスポートし、
 *                 一括登録できるタスク配列を提供します
 */

import { verifyAsyncStorageTask } from './verifyAsyncStorage';
import { loadSettingsTask } from './loadSettings';
import { configureLLMServiceTask } from './configureLLMService';
import { configureChatServiceTask } from './configureChatService';
import { verifyAppReadyTask } from './verifyAppReady';
import { InitializationTask } from '../types';

/**
 * 全ての初期化タスク
 *
 * この配列をAppInitializerに登録することで、
 * アプリケーションの初期化フローを定義します。
 */
export const allInitializationTasks: InitializationTask[] = [
  // Stage 1: CRITICAL - 必須リソース
  verifyAsyncStorageTask,
  loadSettingsTask,

  // Stage 2: CORE - コアサービス
  // （現在、ThemeProviderとKeyboardHeightProviderは既存のProvider内で正常に動作しているため、
  //   明示的な初期化タスクは不要）

  // Stage 3: SERVICES - アプリケーションサービス
  configureLLMServiceTask,
  configureChatServiceTask,

  // Stage 4: READY - UI表示準備完了
  verifyAppReadyTask,
];

// 個別エクスポート（オプション）
export {
  verifyAsyncStorageTask,
  loadSettingsTask,
  configureLLMServiceTask,
  configureChatServiceTask,
  verifyAppReadyTask,
};
