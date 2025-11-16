/**
 * @file WebSocketClient.ts
 * @summary 共通WebSocketクライアント
 * @responsibility セキュアで安定したWebSocket通信を提供
 */

import { logger } from '../../../utils/logger';
import { getAccessToken } from '../../../auth/tokenService';
import {
  WebSocketState,
  WebSocketConfig,
  WebSocketMessage,
  WebSocketEventHandlers,
} from '../types';

/**
 * デフォルトのWebSocket設定
 */
export const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  maxReconnectAttempts: 5,
  reconnectDelay: 2000,
  heartbeatInterval: 30000,
  heartbeatTimeout: 60000,
  timeoutCheckInterval: 10000,
};

/**
 * 共通WebSocketクライアント
 *
 * 特徴:
 * - 自動再接続
 * - ハートビート機能
 * - 接続状態管理
 * - イベントハンドラー
 * - タイプセーフなメッセージング
 */
export class WebSocketClient<T = any> {
  private ws: WebSocket | null = null;
  private url: string;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private config: WebSocketConfig;
  private eventHandlers: WebSocketEventHandlers<T>;
  private logContext: string;

  // 再接続関連
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;

  // ハートビート関連
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutCheck: ReturnType<typeof setInterval> | null = null;
  private lastPongTime: number = 0;

  // ステート変更リスナー
  private stateListeners: Set<(state: WebSocketState) => void> = new Set();

  constructor(
    url: string,
    config: Partial<WebSocketConfig> = {},
    eventHandlers: WebSocketEventHandlers<T> = {},
    logContext: string = 'websocket'
  ) {
    this.url = url;
    this.config = { ...DEFAULT_WEBSOCKET_CONFIG, ...config };
    this.eventHandlers = eventHandlers;
    this.logContext = logContext;
  }

  /**
   * WebSocket接続を確立
   */
  connect(): void {
    if (this.ws && this.state === WebSocketState.CONNECTED) {
      logger.debug(this.logContext, 'Already connected');
      return;
    }

    this.setState(WebSocketState.CONNECTING);
    logger.info(this.logContext, `Connecting to ${this.url}`);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      logger.error(this.logContext, 'Failed to create WebSocket:', error);
      this.setState(WebSocketState.ERROR);
      this.scheduleReconnect();
    }
  }

  /**
   * WebSocket接続を切断
   */
  disconnect(): void {
    logger.info(this.logContext, 'Disconnecting WebSocket');

    this.stopHeartbeat();

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setState(WebSocketState.DISCONNECTED);
    this.reconnectAttempts = 0;
  }

  /**
   * メッセージを送信
   */
  send(message: WebSocketMessage<T>): boolean {
    if (!this.ws || this.state !== WebSocketState.CONNECTED) {
      logger.error(this.logContext, 'Cannot send message: not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      logger.debug(this.logContext, 'Message sent:', message);
      return true;
    } catch (error) {
      logger.error(this.logContext, 'Failed to send message:', error);
      return false;
    }
  }

  /**
   * 現在の接続状態を取得
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * 接続中かどうか
   */
  isConnected(): boolean {
    return this.state === WebSocketState.CONNECTED;
  }

  /**
   * ステート変更リスナーを登録
   */
  addStateListener(listener: (state: WebSocketState) => void): void {
    this.stateListeners.add(listener);
  }

  /**
   * ステート変更リスナーを削除
   */
  removeStateListener(listener: (state: WebSocketState) => void): void {
    this.stateListeners.delete(listener);
  }

  /**
   * イベントハンドラーを更新
   */
  updateEventHandlers(handlers: Partial<WebSocketEventHandlers<T>>): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * WebSocket接続が確立された時のハンドラ
   */
  private async handleOpen(): Promise<void> {
    logger.info(this.logContext, 'WebSocket connected - sending auth message');

    // 認証メッセージを送信
    try {
      const accessToken = await getAccessToken();

      if (!accessToken) {
        logger.error(this.logContext, 'No access token available for WebSocket auth');
        this.ws?.close();
        return;
      }

      // 初回メッセージで認証
      this.ws?.send(JSON.stringify({
        type: 'auth',
        access_token: accessToken,
      }));

      logger.debug(this.logContext, 'Auth message sent');

      // 認証成功メッセージを待つ（handleMessageで処理）
    } catch (error) {
      logger.error(this.logContext, 'Failed to send auth message:', error);
      this.ws?.close();
    }
  }

  /**
   * WebSocketメッセージを受信した時のハンドラ
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const message: WebSocketMessage<T> = JSON.parse(event.data);
      logger.debug(this.logContext, 'Message received:', message);

      // 認証成功メッセージの処理
      if (message.type === 'auth_success') {
        logger.info(this.logContext, 'WebSocket authentication successful');
        this.setState(WebSocketState.CONNECTED);
        this.reconnectAttempts = 0;

        // ハートビートを開始
        this.startHeartbeat();

        // カスタムハンドラーを呼び出し
        if (this.eventHandlers.onOpen) {
          try {
            this.eventHandlers.onOpen();
          } catch (error) {
            logger.error(this.logContext, 'Error in onOpen handler:', error);
          }
        }

        // 接続確認のpingを送信
        this.send({ type: 'ping' });
        return;
      }

      // pongメッセージの処理
      if (message.type === 'pong') {
        this.handlePong();
        return;
      }

      // カスタムハンドラーを呼び出し
      if (this.eventHandlers.onMessage) {
        try {
          await this.eventHandlers.onMessage(message);
        } catch (error) {
          logger.error(this.logContext, 'Error in onMessage handler:', error);
        }
      }
    } catch (error) {
      logger.error(this.logContext, 'Failed to handle message:', error);
    }
  }

  /**
   * WebSocketエラー発生時のハンドラ
   */
  private handleError(error: Event): void {
    logger.error(this.logContext, 'WebSocket error:', error);
    this.setState(WebSocketState.ERROR);

    // カスタムハンドラーを呼び出し
    if (this.eventHandlers.onError) {
      try {
        this.eventHandlers.onError(error);
      } catch (handlerError) {
        logger.error(this.logContext, 'Error in onError handler:', handlerError);
      }
    }
  }

  /**
   * WebSocket接続が閉じられた時のハンドラ
   */
  private handleClose(event: CloseEvent): void {
    logger.info(
      this.logContext,
      `WebSocket closed: code=${event.code}, reason=${event.reason}`
    );
    this.setState(WebSocketState.DISCONNECTED);
    this.ws = null;

    // カスタムハンドラーを呼び出し
    if (this.eventHandlers.onClose) {
      try {
        this.eventHandlers.onClose(event);
      } catch (error) {
        logger.error(this.logContext, 'Error in onClose handler:', error);
      }
    }

    // 再接続が必要かどうかを判断
    if (this.shouldReconnect(event)) {
      logger.info(this.logContext, 'Scheduling reconnection after close');
      this.scheduleReconnect();
    } else {
      logger.info(this.logContext, 'Not reconnecting (intentional disconnect)');
    }
  }

  /**
   * 切断後に再接続すべきかどうかを判断
   */
  private shouldReconnect(event: CloseEvent): boolean {
    // ハートビートタイムアウトの場合は再接続
    if (event.reason === 'Heartbeat timeout') {
      return true;
    }

    // code=1000（正常終了）でもreasonがある場合は再接続
    if (event.code === 1000 && event.reason && event.reason !== '') {
      return true;
    }

    // code=1000（正常終了）かつreason無しは意図的な切断
    if (event.code === 1000) {
      return false;
    }

    // それ以外の異常終了は再接続
    return true;
  }

  /**
   * 再接続をスケジュール
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      logger.error(this.logContext, 'Max reconnect attempts reached');
      this.setState(WebSocketState.ERROR);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectDelay * this.reconnectAttempts;

    logger.info(
      this.logContext,
      `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts} in ${delay}ms`
    );

    this.reconnectTimeout = setTimeout(() => {
      logger.info(this.logContext, 'Attempting to reconnect...');
      this.connect();
    }, delay);
  }

  /**
   * ハートビートを開始
   */
  private startHeartbeat(): void {
    logger.info(
      this.logContext,
      `Starting heartbeat (interval=${this.config.heartbeatInterval}ms, timeout=${this.config.heartbeatTimeout}ms)`
    );

    this.stopHeartbeat();

    // 最後のpong受信時刻を初期化
    this.lastPongTime = Date.now();

    // 定期的にpingを送信
    this.heartbeatInterval = setInterval(() => {
      if (this.state === WebSocketState.CONNECTED) {
        logger.debug(this.logContext, 'Sending heartbeat ping');
        this.send({ type: 'ping' });
      }
    }, this.config.heartbeatInterval);

    // タイムアウトチェック
    this.heartbeatTimeoutCheck = setInterval(() => {
      this.checkHeartbeatTimeout();
    }, this.config.timeoutCheckInterval);
  }

  /**
   * ハートビートを停止
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.heartbeatTimeoutCheck) {
      clearInterval(this.heartbeatTimeoutCheck);
      this.heartbeatTimeoutCheck = null;
    }

    logger.debug(this.logContext, 'Heartbeat stopped');
  }

  /**
   * pongメッセージを処理
   */
  private handlePong(): void {
    const previousPongTime = this.lastPongTime;
    this.lastPongTime = Date.now();
    const timeSinceLast = this.lastPongTime - previousPongTime;
    logger.debug(this.logContext, `Pong received (${timeSinceLast}ms since last pong)`);
  }

  /**
   * ハートビートタイムアウトをチェック
   */
  private checkHeartbeatTimeout(): void {
    if (this.state !== WebSocketState.CONNECTED) {
      return;
    }

    const timeSinceLastPong = Date.now() - this.lastPongTime;

    if (timeSinceLastPong > this.config.heartbeatTimeout) {
      logger.warn(
        this.logContext,
        `Heartbeat timeout detected (${timeSinceLastPong}ms since last pong)`
      );

      if (this.ws) {
        logger.info(this.logContext, 'Closing connection due to heartbeat timeout');
        this.ws.close(1000, 'Heartbeat timeout');
      }
    }
  }

  /**
   * ステートを変更し、リスナーに通知
   */
  private setState(newState: WebSocketState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      logger.debug(this.logContext, `State changed: ${oldState} -> ${newState}`);

      // リスナーに通知
      this.stateListeners.forEach((listener) => {
        try {
          listener(newState);
        } catch (error) {
          logger.error(this.logContext, 'Error in state listener:', error);
        }
      });

      // カスタムハンドラーを呼び出し
      if (this.eventHandlers.onStateChange) {
        try {
          this.eventHandlers.onStateChange(newState);
        } catch (error) {
          logger.error(this.logContext, 'Error in onStateChange handler:', error);
        }
      }
    }
  }
}

/**
 * WebSocketClientファクトリー関数
 */
export function createWebSocketClient<T = any>(
  url: string,
  config?: Partial<WebSocketConfig>,
  eventHandlers?: WebSocketEventHandlers<T>,
  logContext?: string
): WebSocketClient<T> {
  return new WebSocketClient<T>(url, config, eventHandlers, logContext);
}
