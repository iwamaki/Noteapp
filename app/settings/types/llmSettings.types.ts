/**
 * @file llmSettings.types.ts
 * @summary LLM/AI設定の型定義
 */

export interface LLMSettings {
  // LLM基本設定
  llmEnabled: boolean;
  privacyMode: 'normal' | 'private';
  llmService: string;
  llmApiKey: string;

  // ローカルLLM設定
  localLlmUrl: string;
  localLlmPort: string;

  // AI応答設定
  aiResponseStyle: 'concise' | 'detailed' | 'custom';
  contextHistoryLength: number;
  sendFileContextToLLM: boolean;
  llmContextMaxDepth: number;

  // 通知設定
  llmNotifications: boolean;
}

export const defaultLLMSettings: LLMSettings = {
  llmEnabled: process.env.EXPO_PUBLIC_LLM_ENABLED === 'true',
  privacyMode: 'normal',
  llmService: 'openai',
  llmApiKey: '',
  localLlmUrl: 'http://localhost',
  localLlmPort: '8080',
  aiResponseStyle: 'concise',
  contextHistoryLength: 10,
  sendFileContextToLLM: true,
  llmContextMaxDepth: 3,
  llmNotifications: true,
};
