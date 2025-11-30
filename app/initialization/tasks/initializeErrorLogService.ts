/**
 * @file initializeErrorLogService.ts
 * @summary エラーログAPIサービスを初期化する初期化タスク
 * @responsibility アプリ起動時にエラーログAPIサービスを初期化し、
 *                 Loggerと連携してエラー/警告をバックエンドに送信
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import {
  initErrorLogApiService,
  getErrorLogApiService,
} from '../../features/errorLog/services/errorLogApiService';
import { useSystemSettingsStore } from '../../features/settings/settingsStore';
import { logger } from '../../utils/logger';

/**
 * Error Log Service 初期化タスク
 *
 * このタスクは、ErrorLogApiServiceを初期化し、Loggerと連携させます。
 * これにより、error/warnレベルのログが自動的にバックエンドに送信されます。
 *
 * 依存関係:
 * - load-settings（設定が読み込まれている必要がある）
 */
export const initializeErrorLogServiceTask: InitializationTask = {
  id: 'initialize-error-log-service',
  name: 'エラーログAPIの初期化',
  description: 'エラーログAPIサービスを初期化し、Loggerと連携します',
  stage: InitializationStage.SERVICES,
  priority: TaskPriority.LOW, // 他のサービスより優先度低め
  dependencies: ['load-settings'],

  execute: async () => {
    const backendUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

    if (!backendUrl) {
      logger.warn('init', 'Backend URL not configured, skipping Error Log API initialization');
      return;
    }

    try {
      // ErrorLogApiServiceを初期化
      initErrorLogApiService(backendUrl);

      // Loggerにエラーログサービスを設定
      const errorLogService = getErrorLogApiService();
      if (errorLogService) {
        logger.setErrorLogService(errorLogService);

        // ユーザー設定に基づいてバックエンド送信を有効/無効化
        const systemSettings = useSystemSettingsStore.getState();
        const diagnosticDataEnabled = systemSettings.settings.diagnosticDataEnabled;
        logger.setSendToBackend(diagnosticDataEnabled);

        logger.info('init', 'ErrorLogApiService initialized and connected to Logger', {
          diagnosticDataEnabled,
        });
      }
    } catch (error) {
      // エラーログ初期化の失敗は致命的ではない
      logger.warn('init', 'Error log service initialization failed', error);
      throw error;
    }
  },

  fallback: async (error: Error) => {
    logger.warn('init', 'Error log service not available - errors will only be logged locally', error);
    // フォールバック: ローカルログのみ
  },

  retry: {
    maxAttempts: 2,
    delayMs: 1000,
  },

  timeout: 5000,
};
