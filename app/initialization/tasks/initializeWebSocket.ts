/**
 * @file initializeWebSocket.ts
 * @summary WebSocket接続を初期化する初期化タスク
 * @responsibility アプリ起動時にWebSocket接続を確立し、
 *                 バックエンドとの双方向通信を可能にします
 */

import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import ChatService from '../../features/chat';
import { logger } from '../../utils/logger';

/**
 * WebSocket初期化タスク
 *
 * このタスクは、ChatServiceを通じてWebSocket接続を確立します。
 * WebSocket接続により、LLMが必要なファイル内容を動的に取得できるようになります。
 *
 * 依存関係:
 * - configureChatService（ChatServiceの設定が完了している必要がある）
 */
export const initializeWebSocketTask: InitializationTask = {
  id: 'initialize-websocket',
  name: 'WebSocket接続の初期化',
  description: 'バックエンドとのWebSocket接続を確立します',
  stage: InitializationStage.SERVICES,
  priority: TaskPriority.NORMAL,
  dependencies: ['configure-chat-service'], // ChatService設定後に実行

  execute: async () => {
    // バックエンドURLを取得
    const backendUrl = process.env.EXPO_PUBLIC_API_BASE_URL;

    if (!backendUrl) {
      logger.warn('init', 'Backend URL not configured. Skipping WebSocket initialization.');
      return;
    }

    try {
      // WebSocket接続を初期化
      await ChatService.initializeWebSocket(backendUrl);

      // デバッグログ（開発時のみ）
      if (__DEV__) {
        logger.debug('init', 'WebSocket initialized', {
          backendUrl,
          clientId: ChatService.getClientId(),
        });
      }
    } catch (error) {
      // WebSocket初期化の失敗は致命的ではない
      // read_fileツールが使用できなくなるだけで、他の機能は動作する
      logger.warn('init', 'WebSocket initialization failed', error);
      throw error; // フォールバックで処理
    }
  },

  fallback: async (error: Error) => {
    logger.warn('init', 'Using fallback - WebSocket not available', error);
    // フォールバック: WebSocketなしで続行
    // read_fileツールは「開いているファイルのみ」の動作になる
    logger.warn('init', 'File content fetching will be limited to currently open files only.');
  },

  retry: {
    maxAttempts: 3,
    delayMs: 2000, // 2秒待ってリトライ
  },

  timeout: 10000, // 10秒
};
