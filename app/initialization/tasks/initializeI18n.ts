/**
 * @file initializeI18n.ts
 * @summary i18n初期化タスク
 * @responsibility UISettingsから言語設定を読み込み、i18nextの言語を設定します（CRITICAL優先度）
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { useUISettingsStore } from '../../settings/settingsStore';
import { changeLanguage } from '../../i18n';
import { logger } from '../../utils/logger';

/**
 * i18n初期化タスク
 *
 * このタスクはloadSettingsタスクの後に実行され、
 * 保存された言語設定をi18nextに適用します。
 */
export const initializeI18nTask: InitializationTask = {
  id: 'initialize-i18n',
  name: 'i18nの初期化',
  description: 'UISettingsから言語設定を読み込み、i18nextの言語を設定します',
  stage: InitializationStage.CRITICAL,
  priority: TaskPriority.HIGH,
  dependencies: ['load-settings'], // loadSettingsタスクの後に実行

  execute: async () => {
    const { settings } = useUISettingsStore.getState();
    const { language } = settings;

    // i18nextの言語を設定
    await changeLanguage(language);
    logger.info('init', 'Language set', { language });
  },

  fallback: async (error: Error) => {
    logger.warn('init', 'Failed to initialize i18n, using default language', { error });
    // デフォルト言語（日本語）で続行
    await changeLanguage('ja');
  },

  retry: {
    maxAttempts: 2,
    delayMs: 100,
    exponentialBackoff: false,
  },

  timeout: 5000, // 5秒
};
