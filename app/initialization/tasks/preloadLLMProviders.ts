/**
 * @file preloadLLMProviders.ts
 * @summary LLMプロバイダープリロードタスク
 * @responsibility LLMプロバイダーをバックグラウンドで事前読み込みし、
 *                 設定画面への遷移を高速化します
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import APIService from '../../features/llmService/api';

/**
 * LLMプロバイダープリロードタスク
 *
 * LLMプロバイダーをバックグラウンドでプリロードすることで、
 * SettingsScreen初回表示時の「一瞬レンダリングされていない瞬間」を解消します。
 *
 * このタスクは低優先度で実行され、失敗してもアプリケーションの起動に影響しません。
 * SettingsScreenでは、キャッシュがあれば即座に表示、なければ通常通り読み込みを行います。
 */
export const preloadLLMProvidersTask: InitializationTask = {
  id: 'preload-llm-providers',
  name: 'LLMプロバイダープリロード',
  description: 'LLMプロバイダーをバックグラウンドで事前読み込みし、設定画面の表示を高速化します',
  stage: InitializationStage.SERVICES,
  priority: TaskPriority.LOW, // 低優先度（失敗してもアプリ起動に影響しない）
  dependencies: ['configure-llm-service'], // LLMサービス設定後に実行

  execute: async () => {
    try {
      // バックグラウンドでプリロード
      await APIService.loadLLMProviders();

      if (__DEV__) {
        console.log('[preloadLLMProviders] Successfully preloaded LLM providers');
      }
    } catch (error) {
      // エラーログは出すが、エラーを投げない（失敗してもアプリは続行）
      console.warn('[preloadLLMProviders] Failed to preload LLM providers:', error);
      // エラーを握りつぶす（SettingsScreenで再読み込みが試行される）
    }
  },

  fallback: async (error: Error) => {
    // プリロード失敗時は何もしない（SettingsScreenで通常の読み込みが行われる）
    console.warn('[preloadLLMProviders] Preload failed, will load on-demand in SettingsScreen:', error);
  },

  retry: {
    maxAttempts: 1, // リトライは1回のみ（バックグラウンドタスクなので）
    delayMs: 1000,
  },

  timeout: 10000, // 10秒（プリロードなのでタイムアウトは長め）
};
