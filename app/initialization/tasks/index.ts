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
import { initializeBillingServiceTask } from './initializeBillingService';
import { verifyAppReadyTask } from './verifyAppReady';
import { loadIconFontsTask } from './loadIconFonts';
import { loadToolDefinitionsTask } from './loadToolDefinitions';
import { authenticateDevice } from './authenticateDevice';
import { restorePendingPurchasesTask } from './restorePendingPurchases';
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
  authenticateDevice,  // デバイスID認証

  // Stage 2: CORE - コアサービス
  loadIconFontsTask,


  // Stage 3: SERVICES - アプリケーションサービス
  configureLLMServiceTask,
  preloadLLMProvidersTask,
  configureChatServiceTask,
  initializeWebSocketTask,  // WebSocket接続の初期化
  initializeBillingServiceTask,  // Billing APIの初期化
  restorePendingPurchasesTask,  // 未完了購入の復元（Billing初期化後に実行）
  loadToolDefinitionsTask,

  // Stage 4: READY - UI表示準備完了
  verifyAppReadyTask,
];

/**
 * 起動時に必須のタスク（ブロッキング）
 * これらのタスクが完了するまでスプラッシュ画面を表示します
 */
export const blockingInitializationTasks: InitializationTask[] = [
  // Stage 1: CRITICAL - 必須リソース
  verifyAsyncStorageTask,
  initializeFileSystemTask,
  loadSettingsTask,
  authenticateDevice,

  // Stage 2: CORE - コアサービス（UI表示に必須）
  loadIconFontsTask,

  // Stage 4: READY - UI表示準備完了
  verifyAppReadyTask,
];

/**
 * バックグラウンドで実行するタスク（非ブロッキング）
 * 起動後に非同期で実行され、スプラッシュ画面をブロックしません
 */
export const backgroundInitializationTasks: InitializationTask[] = [
  // Stage 3: SERVICES - アプリケーションサービス（起動時は不要）
  configureLLMServiceTask,      // チャット開始時に必要
  preloadLLMProvidersTask,       // 設定画面で必要
  configureChatServiceTask,      // チャット開始時に必要
  initializeWebSocketTask,       // チャット開始時に必要
  initializeBillingServiceTask,  // 購入画面で必要
  restorePendingPurchasesTask,   // バックグラウンドで復元
  loadToolDefinitionsTask,       // チャット開始時に必要
];

// 個別エクスポート（オプション）
export {
  verifyAsyncStorageTask,
  initializeFileSystemTask,
  loadSettingsTask,
  authenticateDevice,
  restorePendingPurchasesTask,
  configureLLMServiceTask,
  preloadLLMProvidersTask,
  configureChatServiceTask,
  initializeWebSocketTask,
  initializeBillingServiceTask,
  loadToolDefinitionsTask,
  verifyAppReadyTask,
};
