/**
 * @file websocketService.ts
 * @summary WebSocket通信を管理するサービスクラス
 * @responsibility バックエンドとの双方向通信、ファイル内容リクエストの処理
 */

import { logger } from '../../../utils/logger';
import { CHAT_CONFIG } from '../config/chatConfig';
import {
  handleFetchFileContent,
  FetchFileContentRequest,
} from './websocket/handlers/fileContentHandler';
import {
  handleFetchSearchResults,
  FetchSearchResultsRequest,
} from './websocket/handlers/searchResultsHandler';

/**
 * WebSocketメッセージの型定義
 */
interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * WebSocket接続状態
 */
export enum WebSocketState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

/**
 * WebSocketサービスクラス
 *
 * バックエンドとのWebSocket接続を管理し、
 * LLMからのファイル内容リクエストに応答します。
 *
 * シングルトンパターンで実装されており、
 * アプリケーション全体で1つのWebSocket接続を共有します。
 */
class WebSocketService {
  private static instance: WebSocketService | null = null;

  private ws: WebSocket | null = null;
  private clientId: string;
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = CHAT_CONFIG.websocket.maxReconnectAttempts;
  private reconnectDelay: number = CHAT_CONFIG.websocket.reconnectDelay;
  private lastUrl: string = ''; // 再接続用URL

  // ステート変更リスナー
  private stateListeners: Set<(state: WebSocketState) => void> = new Set();

  // ハートビート関連
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutCheck: ReturnType<typeof setTimeout> | null = null;
  private lastPongTime: number = 0;
  private readonly HEARTBEAT_INTERVAL = CHAT_CONFIG.websocket.heartbeatInterval;
  private readonly HEARTBEAT_TIMEOUT = CHAT_CONFIG.websocket.heartbeatTimeout;

  private constructor(clientId: string) {
    this.clientId = clientId;
  }

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(clientId: string): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService(clientId);
    }
    return WebSocketService.instance;
  }

  /**
   * WebSocket接続を確立
   */
  public connect(url: string): void {
    if (this.ws && this.state === WebSocketState.CONNECTED) {
      logger.debug('websocket', 'Already connected');
      return;
    }

    // 再接続用にURLを保存
    this.lastUrl = url;

    this.setState(WebSocketState.CONNECTING);
    logger.info('websocket', `Connecting to ${url}/ws/${this.clientId}`);

    try {
      this.ws = new WebSocket(`${url}/ws/${this.clientId}`);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      logger.error('websocket', 'Failed to create WebSocket:', error);
      this.setState(WebSocketState.ERROR);
      this.scheduleReconnect();
    }
  }

  /**
   * WebSocket接続を切断
   */
  public disconnect(): void {
    logger.info('websocket', 'Disconnecting WebSocket');

    // ハートビートを停止
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
   * 現在の接続状態を取得
   */
  public getState(): WebSocketState {
    return this.state;
  }

  /**
   * client_idを取得
   */
  public getClientId(): string {
    return this.clientId;
  }

  /**
   * ステート変更リスナーを登録
   */
  public addStateListener(listener: (state: WebSocketState) => void): void {
    this.stateListeners.add(listener);
  }

  /**
   * ステート変更リスナーを削除
   */
  public removeStateListener(listener: (state: WebSocketState) => void): void {
    this.stateListeners.delete(listener);
  }

  /**
   * メッセージを送信
   */
  private sendMessage(message: WebSocketMessage): void {
    if (!this.ws || this.state !== WebSocketState.CONNECTED) {
      logger.error('websocket', 'Cannot send message: not connected');
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
      logger.debug('websocket', 'Message sent:', message);
    } catch (error) {
      logger.error('websocket', 'Failed to send message:', error);
    }
  }

  /**
   * WebSocket接続が確立された時のハンドラ
   */
  private handleOpen(): void {
    logger.info('websocket', 'WebSocket connected');
    this.setState(WebSocketState.CONNECTED);
    this.reconnectAttempts = 0;

    // ハートビートを開始
    this.startHeartbeat();

    // 接続確認のpingを送信
    this.sendMessage({ type: 'ping' });
  }

  /**
   * WebSocketメッセージを受信した時のハンドラ
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      logger.debug('websocket', 'Message received:', data);

      switch (data.type) {
        case 'fetch_file_content': {
          const response = await handleFetchFileContent(data as FetchFileContentRequest);
          this.sendMessage(response);
          break;
        }

        case 'fetch_search_results': {
          const response = await handleFetchSearchResults(data as FetchSearchResultsRequest);
          this.sendMessage(response);
          break;
        }

        case 'pong':
          this.handlePong();
          break;

        default:
          logger.warn('websocket', `Unknown message type: ${data.type}`);
      }
    } catch (error) {
      logger.error('websocket', 'Failed to handle message:', error);
    }
  }

  /**
   * WebSocketエラー発生時のハンドラ
   */
  private handleError(error: Event): void {
    logger.error('websocket', 'WebSocket error:', error);
    this.setState(WebSocketState.ERROR);
  }

  /**
   * WebSocket接続が閉じられた時のハンドラ
   */
  private handleClose(event: CloseEvent): void {
    logger.info('websocket', `WebSocket closed: code=${event.code}, reason=${event.reason}`);
    this.setState(WebSocketState.DISCONNECTED);
    this.ws = null;

    // 再接続が必要かどうかを判断
    const shouldReconnect = this.shouldReconnectAfterClose(event);

    if (shouldReconnect) {
      logger.info('websocket', 'Scheduling reconnection after close');
      this.scheduleReconnect();
    } else {
      logger.info('websocket', 'Not reconnecting (intentional disconnect)');
    }
  }

  /**
   * 切断後に再接続すべきかどうかを判断
   */
  private shouldReconnectAfterClose(event: CloseEvent): boolean {
    // ハートビートタイムアウトの場合は再接続
    if (event.reason === 'Heartbeat timeout') {
      return true;
    }

    // code=1000（正常終了）でもreasonがある場合は再接続
    // （サーバー側からの切断理由がある場合）
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
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('websocket', 'Max reconnect attempts reached');
      this.setState(WebSocketState.ERROR);
      return;
    }

    if (!this.lastUrl) {
      logger.error('websocket', 'Cannot reconnect: no URL saved');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    logger.info('websocket', `Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      logger.info('websocket', 'Attempting to reconnect...');
      this.connect(this.lastUrl);
    }, delay);
  }

  /**
   * ハートビートを開始
   */
  private startHeartbeat(): void {
    logger.info('websocket', `Starting heartbeat (interval=${this.HEARTBEAT_INTERVAL}ms, timeout=${this.HEARTBEAT_TIMEOUT}ms)`);

    // 既存のハートビートを停止
    this.stopHeartbeat();

    // 最後のpong受信時刻を初期化
    this.lastPongTime = Date.now();

    // 30秒ごとにpingを送信
    this.heartbeatInterval = setInterval(() => {
      if (this.state === WebSocketState.CONNECTED) {
        logger.info('websocket', 'Sending heartbeat ping');
        this.sendMessage({ type: 'ping' });
      } else {
        logger.warn('websocket', `Skipping heartbeat ping (state=${this.state})`);
      }
    }, this.HEARTBEAT_INTERVAL);

    // タイムアウトチェック
    this.heartbeatTimeoutCheck = setInterval(() => {
      this.checkHeartbeatTimeout();
    }, CHAT_CONFIG.websocket.timeoutCheckInterval);

    logger.info('websocket', 'Heartbeat timers initialized');
  }

  /**
   * ハートビートを停止
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      logger.info('websocket', 'Heartbeat interval cleared');
    }

    if (this.heartbeatTimeoutCheck) {
      clearInterval(this.heartbeatTimeoutCheck);
      this.heartbeatTimeoutCheck = null;
      logger.info('websocket', 'Heartbeat timeout check cleared');
    }

    logger.info('websocket', 'Heartbeat stopped');
  }

  /**
   * pongメッセージを処理
   */
  private handlePong(): void {
    const previousPongTime = this.lastPongTime;
    this.lastPongTime = Date.now();
    const timeSinceLast = this.lastPongTime - previousPongTime;
    logger.info('websocket', `Pong received (${timeSinceLast}ms since last pong)`);
  }

  /**
   * ハートビートタイムアウトをチェック
   */
  private checkHeartbeatTimeout(): void {
    if (this.state !== WebSocketState.CONNECTED) {
      logger.debug('websocket', `Skipping heartbeat timeout check (state=${this.state})`);
      return;
    }

    const timeSinceLastPong = Date.now() - this.lastPongTime;
    logger.debug('websocket', `Heartbeat check: ${timeSinceLastPong}ms since last pong`);

    if (timeSinceLastPong > this.HEARTBEAT_TIMEOUT) {
      logger.warn('websocket', `Heartbeat timeout detected (${timeSinceLastPong}ms since last pong, threshold=${this.HEARTBEAT_TIMEOUT}ms)`);

      // タイムアウトした場合は接続を切断して再接続
      if (this.ws) {
        logger.info('websocket', 'Closing connection due to heartbeat timeout');
        this.ws.close();
      }
    }
  }

  /**
   * ステートを変更し、リスナーに通知
   */
  private setState(newState: WebSocketState): void {
    if (this.state !== newState) {
      this.state = newState;
      logger.debug('websocket', `State changed: ${newState}`);

      // リスナーに通知
      this.stateListeners.forEach(listener => {
        try {
          listener(newState);
        } catch (error) {
          logger.error('websocket', 'Error in state listener:', error);
        }
      });
    }
  }
}

export default WebSocketService;
