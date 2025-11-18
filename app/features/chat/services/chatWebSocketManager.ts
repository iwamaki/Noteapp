/**
 * @file chatWebSocketManager.ts
 * @summary ChatService用のWebSocket管理マネージャー
 * @responsibility WebSocket接続の初期化、管理、状態監視を担当
 */

import { logger } from '../../../utils/logger';
import { createWebSocketClient, WebSocketClient, WebSocketMessage } from '../../api';
import { getOrCreateClientId } from '../utils/clientId';
import { CHAT_CONFIG } from '../config/chatConfig';
import {
  handleFetchFileContent,
  FetchFileContentRequest,
} from '../handlers/fileContentHandler';
import {
  handleFetchSearchResults,
  FetchSearchResultsRequest,
} from '../handlers/searchResultsHandler';

/**
 * ChatService用のWebSocket管理マネージャークラス
 */
export class ChatWebSocketManager {
  private wsClient: WebSocketClient | null = null;
  private clientId: string | null = null;
  private isInitialized: boolean = false;

  /**
   * WebSocket接続を初期化
   *
   * アプリ起動時に一度だけ呼び出されます（初期化タスクから）。
   * client_idを生成し、共通WebSocketClientを初期化してバックエンドに接続します。
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

      // 共通WebSocketClientを使用（自動再接続、ハートビート付き）
      this.wsClient = createWebSocketClient(
        `${backendUrl}/ws`,
        {
          maxReconnectAttempts: CHAT_CONFIG.websocket.maxReconnectAttempts,
          reconnectDelay: CHAT_CONFIG.websocket.reconnectDelay,
          heartbeatInterval: CHAT_CONFIG.websocket.heartbeatInterval,
          heartbeatTimeout: CHAT_CONFIG.websocket.heartbeatTimeout,
          timeoutCheckInterval: CHAT_CONFIG.websocket.timeoutCheckInterval,
        },
        {
          onMessage: this.handleMessage.bind(this),
          onStateChange: (state) => {
            logger.info('chatService', `WebSocket state changed: ${state}`);
          },
          onError: (error) => {
            logger.error('chatService', 'WebSocket error:', error);
          },
        },
        'chat'
      );

      // WebSocket接続を確立
      this.wsClient.connect();

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
    if (this.wsClient) {
      this.wsClient.disconnect();
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
   * WebSocketクライアントのインスタンスを取得
   */
  getClient(): WebSocketClient | null {
    return this.wsClient;
  }

  /**
   * 初期化済みかどうかを確認
   */
  isWebSocketInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * WebSocketメッセージハンドラー
   * LLMからのリクエスト（ファイル内容取得、検索結果取得など）に応答します
   */
  private async handleMessage(message: WebSocketMessage): Promise<void> {
    try {
      logger.debug('chatService', 'Handling WebSocket message:', message);

      switch (message.type) {
        case 'fetch_file_content': {
          const response = await handleFetchFileContent(message as FetchFileContentRequest);
          this.wsClient?.send(response);
          break;
        }

        case 'fetch_search_results': {
          const response = await handleFetchSearchResults(message as FetchSearchResultsRequest);
          this.wsClient?.send(response);
          break;
        }

        case 'pong':
          // ハートビートのpongは共通WebSocketClientが自動処理
          logger.debug('chatService', 'Pong received');
          break;

        default:
          logger.warn('chatService', `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      logger.error('chatService', 'Failed to handle WebSocket message:', error);
    }
  }
}
