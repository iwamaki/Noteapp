/**
 * @file loadToolDefinitions.ts
 * @summary ツール定義読み込みタスク
 * @responsibility サーバーからLLMツール定義を取得し、ToolServiceを初期化します
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import ToolService from '../../features/chat/services/ToolService';
import { logger } from '../../utils/logger';

/**
 * ツール定義読み込みタスク
 *
 * サーバーの /api/tools エンドポイントからツール定義を取得し、
 * ToolServiceを初期化します。これにより、フロントエンドでツールの
 * スキーマベース検証が可能になります。
 */
export const loadToolDefinitionsTask: InitializationTask = {
  id: 'load-tool-definitions',
  name: 'ツール定義読み込み',
  description: 'サーバーからLLMツール定義を取得し、ToolServiceを初期化します',
  stage: InitializationStage.SERVICES,
  priority: TaskPriority.NORMAL,
  dependencies: [], // 他のタスクに依存しない

  execute: async () => {
    await ToolService.initialize();

    // デバッグログ（開発時のみ）
    if (__DEV__) {
      const tools = ToolService.getTools();
      logger.debug('init', 'Tool definitions loaded', {
        count: tools.length,
        tools: tools.map(t => t.name),
      });
    }
  },

  fallback: async (error: Error) => {
    logger.warn('init', 'Failed to load tool definitions', { error });
    logger.warn('init', 'Continuing with empty tool definitions');
    // ToolServiceはエラー時に空配列で初期化されるため、アプリケーションは継続可能
    // ただし、コマンド検証機能は利用できなくなります
  },

  retry: {
    maxAttempts: 3,
    delayMs: 500,
  },

  timeout: 10000, // 10秒
};
