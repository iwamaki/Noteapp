/**
 * @file initializeBillingService.ts
 * @summary Billing API サービスを初期化する初期化タスク
 * @responsibility アプリ起動時にBilling APIサービスを初期化し、
 *                 トークン残高をバックエンドから読み込みます
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { initBillingApiService } from '../../billing/services/billingApiService';
import { useSettingsStore } from '../../settings/settingsStore';

/**
 * Billing Service 初期化タスク
 *
 * このタスクは、BillingApiServiceを初期化し、トークン残高をロードします。
 * バックエンドからトークン残高を取得することで、複数デバイス間での同期が可能になります。
 *
 * 依存関係:
 * - load-settings（設定が読み込まれている必要がある）
 */
export const initializeBillingServiceTask: InitializationTask = {
  id: 'initialize-billing-service',
  name: 'Billing APIの初期化',
  description: 'Billing APIサービスを初期化し、トークン残高を読み込みます',
  stage: InitializationStage.SERVICES,
  priority: TaskPriority.NORMAL,
  dependencies: ['load-settings'], // 設定読み込み後に実行

  execute: async () => {
    // バックエンドURLを取得
    const backendUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

    if (!backendUrl) {
      console.warn('[initializeBillingService] Backend URL not configured. Skipping Billing API initialization.');
      return;
    }

    try {
      // BillingApiServiceを初期化
      initBillingApiService(backendUrl);
      console.log('[initializeBillingService] BillingApiService initialized:', { backendUrl });

      // トークン残高をバックエンドから読み込み
      await useSettingsStore.getState().loadTokenBalance();
      console.log('[initializeBillingService] Token balance loaded from backend');

      // デバッグログ（開発時のみ）
      if (__DEV__) {
        const { tokenBalance } = useSettingsStore.getState().settings;
        console.log('[initializeBillingService] Current balance:', {
          credits: tokenBalance.credits,
          models: Object.keys(tokenBalance.allocatedTokens).length,
        });
      }
    } catch (error) {
      // Billing初期化の失敗は致命的ではない
      // ローカルキャッシュを使用して動作を続行できる
      console.warn('[initializeBillingService] Billing service initialization failed:', error);
      throw error; // フォールバックで処理
    }
  },

  fallback: async (error: Error) => {
    console.warn('[initializeBillingService] Using fallback - Billing API not available:', error);
    // フォールバック: ローカルキャッシュを使用
    console.warn('[initializeBillingService] Using cached token balance from AsyncStorage.');
    // 設定は既に loadSettings() で読み込まれているので、キャッシュが使用される
  },

  retry: {
    maxAttempts: 3,
    delayMs: 2000, // 2秒待ってリトライ
  },

  timeout: 10000, // 10秒
};
