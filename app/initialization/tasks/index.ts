/**
 * @file index.ts
 * @summary 初期化タスクのエントリーポイント
 * @responsibility 全ての初期化タスクをエクスポートし、
 *                 一括登録できるタスク配列を提供します
 */

import { verifyAsyncStorageTask } from './verifyAsyncStorage';
import { initializeFileSystemTask } from './initializeFileSystem';
import { loadSettingsTask } from './loadSettings';
import { configureLLMServiceTask } from './configureLLMService';
import { preloadLLMProvidersTask } from './preloadLLMProviders';
import { configureChatServiceTask } from './configureChatService';
import { initializeWebSocketTask } from './initializeWebSocket';
import { verifyAppReadyTask } from './verifyAppReady';
import { loadIconFontsTask } from './loadIconFonts';
import { loadToolDefinitionsTask } from './loadToolDefinitions';
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
  initializeFileSystemTask,  // FileSystemディレクトリ構造の初期化
  loadSettingsTask,

  // Stage 2: CORE - コアサービス
  loadIconFontsTask,


  // Stage 3: SERVICES - アプリケーションサービス
  configureLLMServiceTask,
  preloadLLMProvidersTask,
  configureChatServiceTask,
  initializeWebSocketTask,  // WebSocket接続の初期化
  loadToolDefinitionsTask,

  // Stage 4: READY - UI表示準備完了
  verifyAppReadyTask,
];

// 個別エクスポート（オプション）
export {
  verifyAsyncStorageTask,
  initializeFileSystemTask,
  loadSettingsTask,
  configureLLMServiceTask,
  preloadLLMProvidersTask,
  configureChatServiceTask,
  initializeWebSocketTask,
  loadToolDefinitionsTask,
  verifyAppReadyTask,
};
