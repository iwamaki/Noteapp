/**
 * @file loadIconFonts.ts
 * @summary アプリケーションで使用されるアイコンフォントをプリロードする初期化タスク
 * @responsibility アプリケーション起動時にアイコンフォントを非同期で読み込み、
 *                 UI表示の遅延（FOUC）を防ぎます。
 */

import * as Font from 'expo-font';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { logger } from '../../utils/logger';

/**
 * アイコンフォント読み込みタスク
 *
 * このタスクは、アプリケーションのコアアセットであるアイコンフォントを
 * 起動プロセスのできるだけ早い段階で読み込むことを目的としています。
 * これにより、アイコンの表示遅延やちらつきを防ぎ、
 * スムーズなユーザーエクスペリエンスを提供します。
 *
 * @property {string} id - タスクの一意識別子
 * @property {string} name - タスクの表示名
 * @property {string} description - タスクの詳細な説明
 * @property {InitializationStage} stage - 実行ステージ (CORE)
 * @property {TaskPriority} priority - タスクの優先度 (HIGH)
 * @property {Function} execute - タスクの実行ロジック
 */
export const loadIconFontsTask: InitializationTask = {
  id: 'load-icon-fonts',
  name: 'Load Icon Fonts',
  description: 'Pre-loads the main icon fonts to prevent UI flickering.',
  stage: InitializationStage.CORE,
  priority: TaskPriority.HIGH,
  execute: async () => {
    try {
      await Font.loadAsync({
        ...Ionicons.font,
        ...MaterialCommunityIcons.font,
      });
      logger.info('init', 'Icon fonts loaded successfully');
    } catch (error) {
      logger.error('init', 'Failed to load icon fonts', { error });
      // エラーを再スローして、初期化プロセスに失敗を通知する
      throw error;
    }
  },
  // このタスクはUIの基本要素に関わるため、リトライを設定
  retry: {
    maxAttempts: 3,
    delayMs: 1000,
    exponentialBackoff: true,
  },
  // タイムアウトを10秒に設定
  timeout: 10000,
};
