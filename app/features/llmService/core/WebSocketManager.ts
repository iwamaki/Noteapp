/**
 * @file WebSocketManager.ts
 * @summary LLMサービス用のWebSocket管理マネージャー（コア実装）
 * @responsibility WebSocket接続の初期化、管理、状態監視を担当
 */

import { logger } from '../../../utils/logger';
import { createWebSocketClient, WebSocketClient, WebSocketMessage } from '../../api';

/**
 * WebSocketManagerの設定オプション
 */
export interface WebSocketManagerConfig {
  /** 最大再接続試行回数 */
  maxReconnectAttempts?: number;
  /** 再接続遅延（ミリ秒） */
  reconnectDelay?: number;
  /** ハートビート間隔（ミリ秒） */
  heartbeatInterval?: number;
  /** ハートビートタイムアウト（ミリ秒） */
  heartbeatTimeout?: number;
  /** タイムアウトチェック間隔（ミリ秒） */
  timeoutCheckInterval?: number;
}

/**
 * メッセージハンドラー型
 */
export type MessageHandler = (message: WebSocketMessage) => Promise<void> | void;

/**
 * WebSocketManagerのコールバック
 */
export interface WebSocketManagerCallbacks {
  /** メッセージ受信時のコールバック */
  onMessage?: MessageHandler;
  /** 状態変更時のコールバック */
  onStateChange?: (state: string) => void;
  /** エラー発生時のコールバック */
  onError?: (error: any) => void;
}

/**
 * LLMサービス用のWebSocket管理マネージャークラス（コア実装）
 */
export class WebSocketManager {
  private wsClient: WebSocketClient | null = null;
  private isInitialized: boolean = false;
  private logContext: string;

  constructor(logContext: string = 'websocket') {
    this.logContext = logContext;
  }

  /**
   * WebSocket接続を初期化
   *
   * @param url WebSocketのURL（例: "wss://example.com/ws"）
   * @param config WebSocket設定
   * @param callbacks コールバック関数
   */
  async initialize(
    url: string,
    config: WebSocketManagerConfig = {},
    callbacks: WebSocketManagerCallbacks = {}
  ): Promise<void> {
    if (this.isInitialized) {
      logger.debug(this.logContext, 'WebSocket already initialized');
      return;
    }

    try {
      // 共通WebSocketClientを使用（自動再接続、ハートビート付き）
      this.wsClient = createWebSocketClient(
        url,
        {
          maxReconnectAttempts: config.maxReconnectAttempts,
          reconnectDelay: config.reconnectDelay,
          heartbeatInterval: config.heartbeatInterval,
          heartbeatTimeout: config.heartbeatTimeout,
          timeoutCheckInterval: config.timeoutCheckInterval,
        },
        {
          onMessage: callbacks.onMessage,
          onStateChange: callbacks.onStateChange,
          onError: callbacks.onError,
        },
        this.logContext
      );

      // WebSocket接続を確立
      this.wsClient.connect();

      this.isInitialized = true;
      logger.info(this.logContext, 'WebSocket initialization completed');
    } catch (error) {
      logger.error(this.logContext, 'Failed to initialize WebSocket:', error);
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
      logger.info(this.logContext, 'WebSocket disconnected');
    }
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
   * メッセージを送信
   * @param message 送信するメッセージ
   */
  send(message: any): void {
    if (!this.wsClient) {
      logger.warn(this.logContext, 'Cannot send message: WebSocket not initialized');
      return;
    }
    this.wsClient.send(message);
  }
}
