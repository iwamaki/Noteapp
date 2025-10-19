/**
 * @file configureChatService.ts
 * @summary ChatService設定タスク
 * @responsibility 設定ストアからLLM設定を読み込み、ChatServiceに適用します
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { useSettingsStore } from '../../settings/settingsStore';
import ChatService from '../../features/chat';

/**
 * ChatService設定タスク
 *
 * SettingsStoreから読み込んだLLM設定をChatServiceに適用します。
 * ChatServiceはシングルトンで、LLMプロバイダーとモデルを管理します。
 */
export const configureChatServiceTask: InitializationTask = {
  id: 'configure-chat-service',
  name: 'ChatService設定',
  description: '設定ストアからLLM設定を読み込み、ChatServiceに適用します',
  stage: InitializationStage.SERVICES,
  priority: TaskPriority.NORMAL,
  dependencies: ['load-settings'], // 設定読み込み後に実行

  execute: async () => {
    const { settings } = useSettingsStore.getState();

    // ChatServiceにLLM設定を適用
    if (settings.llmProvider && settings.llmModel) {
      ChatService.setLLMConfig(settings.llmProvider, settings.llmModel);

      // デバッグログ（開発時のみ）
      if (__DEV__) {
        console.log('[configureChatService] ChatService configured:', {
          provider: settings.llmProvider,
          model: settings.llmModel,
        });
      }
    }
  },

  fallback: async (error: Error) => {
    console.warn('[configureChatService] Failed to configure ChatService, using defaults:', error);
    // デフォルト設定はChatServiceで既に設定されているため、
    // フォールバックは特に必要ありません
  },

  retry: {
    maxAttempts: 2,
    delayMs: 300,
  },

  timeout: 5000, // 5秒
};
