/**
 * @file configureLLMService.ts
 * @summary LLMサービス設定タスク
 * @responsibility 設定ストアからLLM設定を読み込み、LLMサービスに適用します
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { useSettingsStore } from '../../settings/settingsStore';
import APIService from '../../services/llmService/api';

/**
 * LLMサービス設定タスク
 *
 * SettingsStoreから読み込んだLLM設定（プロバイダー、モデル等）を
 * LLMServiceに適用します。
 */
export const configureLLMServiceTask: InitializationTask = {
  id: 'configure-llm-service',
  name: 'LLMサービス設定',
  description: '設定ストアからLLM設定を読み込み、LLMサービスに適用します',
  stage: InitializationStage.SERVICES,
  priority: TaskPriority.HIGH,
  dependencies: ['load-settings'], // 設定読み込み後に実行

  execute: async () => {
    const { settings } = useSettingsStore.getState();

    // LLMプロバイダーとモデルを設定
    if (settings.llmProvider) {
      APIService.setLLMProvider(settings.llmProvider);
    }

    if (settings.llmModel) {
      APIService.setLLMModel(settings.llmModel);
    }

    // デバッグログ（開発時のみ）
    if (__DEV__) {
      console.log('[configureLLMService] LLM configured:', {
        provider: settings.llmProvider,
        model: settings.llmModel,
      });
    }
  },

  fallback: async (error: Error) => {
    console.warn('[configureLLMService] Failed to configure LLM service, using defaults:', error);
    // デフォルト設定はLLMServiceのコンストラクタで既に設定されているため、
    // フォールバックは特に必要ありません
  },

  retry: {
    maxAttempts: 2,
    delayMs: 300,
  },

  timeout: 5000, // 5秒
};
