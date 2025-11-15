/**
 * @file chatWebSocketManager.ts
 * @summary ChatService用のWebSocket管理マネージャー
 * @responsibility WebSocket接続の初期化、管理、状態監視を担当
 */

import { logger } from '../../../utils/logger';
import WebSocketService from '../llmService/services/WebSocketService';
import { getOrCreateClientId } from '../utils/clientId';

/**
 * ChatService用のWebSocket管理マネージャークラス
 */
export class ChatWebSocketManager {
  private wsService: WebSocketService | null = null;
  private clientId: string | null = null;
  private isInitialized: boolean = false;

  /**
   * WebSocket接続を初期化
   *
   * アプリ起動時に一度だけ呼び出されます（初期化タスクから）。
   * client_idを生成し、WebSocketサービスを初期化してバックエンドに接続します。
   *
   * @param backendUrl バックエンドのURL（例: "https://xxxxx.ngrok-free.app"）
   */
  async initialize(backendUrl: string): Promise<void> {
    if (this.isInitialized) {
      logger.debug('chatService', 'WebSocket already initialized');
      return;
    }

    try {
      // client_idを取得または生成
      this.clientId = await getOrCreateClientId();
      logger.info('chatService', `WebSocket client_id: ${this.clientId}`);

      // WebSocketサービスを初期化
      this.wsService = WebSocketService.getInstance(this.clientId);

      // WebSocket状態変更リスナーを追加（デバッグ用）
      this.wsService.addStateListener((state) => {
        logger.info('chatService', `WebSocket state changed: ${state}`);
      });

      // WebSocket接続を確立
      this.wsService.connect(backendUrl);

      this.isInitialized = true;
      logger.info('chatService', 'WebSocket initialization completed');
    } catch (error) {
      logger.error('chatService', 'Failed to initialize WebSocket:', error);
      throw error;
    }
  }

  /**
   * WebSocket接続を切断
   */
  disconnect(): void {
    if (this.wsService) {
      this.wsService.disconnect();
      this.isInitialized = false;
      logger.info('chatService', 'WebSocket disconnected');
    }
  }

  /**
   * client_idを取得
   */
  getClientId(): string | null {
    return this.clientId;
  }

  /**
   * WebSocketサービスのインスタンスを取得
   */
  getService(): WebSocketService | null {
    return this.wsService;
  }

  /**
   * 初期化済みかどうかを確認
   */
  isWebSocketInitialized(): boolean {
    return this.isInitialized;
  }
}
