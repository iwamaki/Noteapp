/**
 * @file configureChatService.ts
 * @summary ChatService設定タスク
 * @responsibility ChatServiceの初期化（LLM設定はAPIServiceから取得）
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';

/**
 * ChatService設定タスク
 *
 * Note: ChatServiceはAPIServiceからLLM設定を読み取るため、
 * このタスクでの設定は不要です。configureLLMServiceTaskが
 * APIService（ProviderManager）を正しく設定します。
 */
export const configureChatServiceTask: InitializationTask = {
  id: 'configure-chat-service',
  name: 'ChatService設定',
  description: 'ChatService初期化（LLM設定はAPIServiceから取得）',
  stage: InitializationStage.SERVICES,
  priority: TaskPriority.NORMAL,
  dependencies: ['load-settings', 'configure-llm-service'], // LLMサービス設定後に実行

  execute: async () => {
    // ChatServiceはAPIServiceからLLM設定を読み取るため、
    // ここでの設定は不要です。
    if (__DEV__) {
      console.log('[configureChatService] ChatService initialized (no configuration needed)');
    }
  },

  fallback: async (error: Error) => {
    console.warn('[configureChatService] Failed to initialize ChatService:', error);
  },

  retry: {
    maxAttempts: 2,
    delayMs: 300,
  },

  timeout: 5000, // 5秒
};
