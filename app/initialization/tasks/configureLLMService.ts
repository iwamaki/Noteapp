/**
 * @file configureLLMService.ts
 * @summary LLMサービス設定タスク
 * @responsibility 設定ストアからLLM設定を読み込み、LLMサービスに適用します
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { useSettingsStore } from '../../settings/settingsStore';
import APIService from '../../features/llmService/api';

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

    // loadedModelsから初期モデルを取得（thinkモデルを優先）
    const initialModelId = settings.loadedModels?.think || settings.loadedModels?.quick || 'gemini-2.5-pro';

    // バックエンドから取得したプロバイダー情報を使って、モデルIDに対応するプロバイダーを取得
    try {
      const providers = await APIService.loadLLMProviders();
      let providerName: string | undefined;

      // どのプロバイダーにこのモデルが含まれているかを探す
      for (const [name, provider] of Object.entries(providers)) {
        if (provider.models.includes(initialModelId)) {
          providerName = name;
          break;
        }
      }

      if (providerName) {
        APIService.setLLMProvider(providerName);
        APIService.setLLMModel(initialModelId);

        // デバッグログ（開発時のみ）
        if (__DEV__) {
          console.log('[configureLLMService] LLM configured:', {
            provider: providerName,
            model: initialModelId,
          });
        }
      } else {
        console.warn('[configureLLMService] Provider not found for model:', initialModelId);
      }
    } catch (error) {
      console.error('[configureLLMService] Failed to load providers:', error);
      throw error;
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
