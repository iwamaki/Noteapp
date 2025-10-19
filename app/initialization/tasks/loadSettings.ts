/**
 * @file loadSettings.ts
 * @summary 設定読み込みタスク
 * @responsibility AsyncStorageからアプリケーション設定を読み込み、
 *                 SettingsStoreを初期化します（CRITICAL優先度）
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { useSettingsStore } from '../../settings/settingsStore';

/**
 * 設定読み込みタスク
 *
 * このタスクは最も重要で、他の多くのタスクがこのタスクに依存します。
 * 失敗した場合はデフォルト設定で続行します。
 */
export const loadSettingsTask: InitializationTask = {
  id: 'load-settings',
  name: '設定の読み込み',
  description: 'AsyncStorageからユーザー設定を読み込みます',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.CRITICAL,
  dependencies: [],

  execute: async () => {
    const { loadSettings } = useSettingsStore.getState();
    await loadSettings();
  },

  fallback: async (error: Error) => {
    console.warn('[loadSettingsTask] Failed to load settings, using defaults:', error);
    // SettingsStoreは既にデフォルト値で初期化されているため、
    // フォールバック処理は特に必要ありません
  },

  retry: {
    maxAttempts: 3,
    delayMs: 500,
    exponentialBackoff: true,
  },

  timeout: 10000, // 10秒
};
