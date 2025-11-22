/**
 * @file verifyAppReady.ts
 * @summary アプリケーション準備完了確認タスク
 * @responsibility アプリケーションが正常に起動できる状態かを最終確認します
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import {
  useUISettingsStore,
  useTokenBalanceStore,
  useUsageTrackingStore
} from '../../settings/settingsStore';
import { logger } from '../../utils/logger';

/**
 * アプリケーション準備完了確認タスク
 *
 * 全ての初期化が完了し、アプリケーションが正常に起動できる状態かを
 * 最終確認します。このタスクは全てのステージの最後に実行されます。
 */
export const verifyAppReadyTask: InitializationTask = {
  id: 'verify-app-ready',
  name: 'アプリ準備完了確認',
  description: 'アプリケーションが正常に起動できる状態かを最終確認します',
  stage: InitializationStage.READY,
  priority: TaskPriority.CRITICAL,
  dependencies: [
    'load-settings',
    'configure-llm-service',
    'configure-chat-service',
  ],

  execute: async () => {
    // 月次使用量のリセットチェック
    const { checkAndResetMonthlyUsageIfNeeded } = useUsageTrackingStore.getState();
    await checkAndResetMonthlyUsageIfNeeded();

    // 設定が正常に読み込まれているか確認
    const uiStore = useUISettingsStore.getState();
    const tokenStore = useTokenBalanceStore.getState();

    if (uiStore.isLoading || tokenStore.isLoading) {
      throw new Error('Settings are still loading');
    }

    if (!uiStore.settings || !tokenStore.loadedModels) {
      throw new Error('Settings are not available');
    }

    // デバッグログ（開発時のみ）
    if (__DEV__) {
      logger.debug('init', 'App is ready to start');
      logger.debug('init', 'Settings loaded', {
        theme: uiStore.settings.theme,
        fontSize: uiStore.settings.fontSize,
        loadedModels: tokenStore.loadedModels,
      });
    }
  },

  fallback: async (error: Error) => {
    logger.warn('init', 'Verification failed, but continuing', { error });
    // 検証に失敗してもアプリを起動させる（警告のみ）
  },

  retry: {
    maxAttempts: 1,
    delayMs: 100,
  },

  timeout: 3000, // 3秒
};
