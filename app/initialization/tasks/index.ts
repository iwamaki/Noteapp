/**
 * @file index.ts
 * @summary 初期化タスクのエントリーポイント
 * @responsibility 全ての初期化タスクをエクスポートし、
 *                 一括登録できるタスク配列を提供します
 */

import { verifyAsyncStorageTask } from './verifyAsyncStorage';
import { initializeFileSystemTask } from './initializeFileSystem';
import { loadSettingsTask } from './loadSettings';
import { initializeI18nTask } from './initializeI18n';
import { configureLLMServiceTask } from './configureLLMService';
import { preloadLLMProvidersTask } from './preloadLLMProviders';
import { configureChatServiceTask } from './configureChatService';
import { initializeWebSocketTask } from './initializeWebSocket';
import { initializeBillingServiceTask } from './initializeBillingService';
import { initializeErrorLogServiceTask } from './initializeErrorLogService';
import { verifyAppReadyTask } from './verifyAppReady';
import { loadIconFontsTask } from './loadIconFonts';
import { loadToolDefinitionsTask } from './loadToolDefinitions';
import { authenticateDevice } from './authenticateDevice';
import { restorePendingPurchasesTask } from './restorePendingPurchases';
import { InitializationTask } from '../types';
import { isLLMFeatureAvailable } from '../../features/settings/settingsStore';

/**
 * 全ての初期化タスク
 *
 * この配列をAppInitializerに登録することで、
 * アプリケーションの初期化フローを定義します。
 * LLM関連タスクは環境変数で機能が無効の場合は除外されます。
 */
export const allInitializationTasks: InitializationTask[] = [
  // Stage 1: CRITICAL - 必須リソース
  verifyAsyncStorageTask,
  initializeFileSystemTask,  // FileSystemディレクトリ構造の初期化
  loadSettingsTask,
  initializeI18nTask,  // i18nの初期化（loadSettings後）
  authenticateDevice,  // デバイスID認証

  // Stage 2: CORE - コアサービス
  loadIconFontsTask,

  // Stage 3: SERVICES - アプリケーションサービス
  // LLM関連タスク（環境変数で機能が有効な場合のみ）
  ...(isLLMFeatureAvailable
    ? [
        configureLLMServiceTask,
        preloadLLMProvidersTask,
        configureChatServiceTask,
        initializeWebSocketTask,
        initializeBillingServiceTask,
        restorePendingPurchasesTask,
        loadToolDefinitionsTask,
      ]
    : []),
  initializeErrorLogServiceTask,  // エラーログAPIの初期化（常に実行）

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
  initializeI18nTask,  // i18nの初期化（loadSettings後）
  authenticateDevice,

  // Stage 2: CORE - コアサービス（UI表示に必須）
  loadIconFontsTask,

  // Stage 4: READY - UI表示準備完了
  verifyAppReadyTask,
];

/**
 * LLM関連の初期化タスク（LLM機能が有効な場合のみ実行）
 */
const llmRelatedTasks: InitializationTask[] = isLLMFeatureAvailable
  ? [
      configureLLMServiceTask,      // チャット開始時に必要
      preloadLLMProvidersTask,       // 設定画面で必要
      configureChatServiceTask,      // チャット開始時に必要
      initializeWebSocketTask,       // チャット開始時に必要
      initializeBillingServiceTask,  // 購入画面で必要
      restorePendingPurchasesTask,   // バックグラウンドで復元
      loadToolDefinitionsTask,       // チャット開始時に必要
    ]
  : [];

/**
 * バックグラウンドで実行するタスク（非ブロッキング）
 * 起動後に非同期で実行され、スプラッシュ画面をブロックしません
 */
export const backgroundInitializationTasks: InitializationTask[] = [
  // Stage 3: SERVICES - アプリケーションサービス（起動時は不要）
  ...llmRelatedTasks,
  initializeErrorLogServiceTask, // エラーログ送信用（LLM機能に関係なく常に実行）
];

// 個別エクスポート（オプション）
export {
  verifyAsyncStorageTask,
  initializeFileSystemTask,
  loadSettingsTask,
  initializeI18nTask,
  authenticateDevice,
  restorePendingPurchasesTask,
  configureLLMServiceTask,
  preloadLLMProvidersTask,
  configureChatServiceTask,
  initializeWebSocketTask,
  initializeBillingServiceTask,
  initializeErrorLogServiceTask,
  loadToolDefinitionsTask,
  verifyAppReadyTask,
};
