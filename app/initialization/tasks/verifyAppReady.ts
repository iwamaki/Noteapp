/**
 * @file verifyAppReady.ts
 * @summary アプリケーション準備完了確認タスク
 * @responsibility アプリケーションが正常に起動できる状態かを最終確認します
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { useSettingsStore } from '../../settings/settingsStore';

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
  priority: TaskPriority.NORMAL,
  dependencies: [
    'load-settings',
    'configure-llm-service',
    'configure-chat-service',
  ],

  execute: async () => {
    // 設定が正常に読み込まれているか確認
    const { settings, isLoading } = useSettingsStore.getState();

    if (isLoading) {
      throw new Error('Settings are still loading');
    }

    if (!settings) {
      throw new Error('Settings are not available');
    }

    // デバッグログ（開発時のみ）
    if (__DEV__) {
      console.log('[verifyAppReady] App is ready to start');
      console.log('[verifyAppReady] Settings loaded:', {
        theme: settings.theme,
        fontSize: settings.fontSize,
        llmProvider: settings.llmProvider,
      });
    }
  },

  fallback: async (error: Error) => {
    console.warn('[verifyAppReady] Verification failed, but continuing:', error);
    // 検証に失敗してもアプリを起動させる（警告のみ）
  },

  retry: {
    maxAttempts: 1,
    delayMs: 100,
  },

  timeout: 3000, // 3秒
};
