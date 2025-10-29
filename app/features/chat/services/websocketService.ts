/**
 * @file websocketService.ts
 * @summary WebSocket通信を管理するサービスクラス
 * @responsibility バックエンドとの双方向通信、ファイル内容リクエストの処理
 */

import { logger } from '../../../utils/logger';
import { FileRepository } from '@data/repositories/fileRepository';

/**
 * WebSocketメッセージの型定義
 */
interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

/**
 * fetch_file_contentリクエスト
 */
interface FetchFileContentRequest extends WebSocketMessage {
  type: 'fetch_file_content';
  request_id: string;
  title: string;
}

/**
 * file_content_responseレスポンス
 */
interface FileContentResponse extends WebSocketMessage {
  type: 'file_content_response';
  request_id: string;
  title: string;
  content: string | null;
  error?: string;
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
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000; // 3秒

  // ステート変更リスナー
  private stateListeners: Set<(state: WebSocketState) => void> = new Set();

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
        case 'fetch_file_content':
          await this.handleFetchFileContent(data as FetchFileContentRequest);
          break;

        case 'pong':
          logger.debug('websocket', 'Pong received');
          break;

        default:
          logger.warn('websocket', `Unknown message type: ${data.type}`);
      }
    } catch (error) {
      logger.error('websocket', 'Failed to handle message:', error);
    }
  }

  /**
   * fetch_file_contentリクエストを処理
   */
  private async handleFetchFileContent(request: FetchFileContentRequest): Promise<void> {
    const { request_id, title } = request;

    logger.info('websocket', `Fetching file content: title=${title}, request_id=${request_id}`);

    try {
      // Expo FileSystemからファイルを取得
      const files = await FileRepository.getAll();
      const file = files.find(f => f.title === title);

      if (!file) {
        logger.warn('websocket', `File not found: ${title}`);

        // ファイルが見つからない場合
        const response: FileContentResponse = {
          type: 'file_content_response',
          request_id,
          title,
          content: null,
          error: `File '${title}' not found`,
        };

        this.sendMessage(response);
        return;
      }

      // ファイル内容を返す
      const response: FileContentResponse = {
        type: 'file_content_response',
        request_id,
        title,
        content: file.content || '',
      };

      this.sendMessage(response);
      logger.info('websocket', `File content sent: title=${title}, length=${file.content?.length || 0}`);

    } catch (error) {
      logger.error('websocket', `Failed to fetch file content: ${title}`, error);

      // エラーレスポンス
      const response: FileContentResponse = {
        type: 'file_content_response',
        request_id,
        title,
        content: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.sendMessage(response);
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

    // 意図的な切断でない場合は再接続を試みる
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * 再接続をスケジュール
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('websocket', 'Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    logger.info('websocket', `Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimeout = setTimeout(() => {
      // 再接続時のURLは保存しておく必要がある
      // 今回は簡易的にエラーログのみ
      logger.warn('websocket', 'Auto-reconnect not implemented yet. Please reconnect manually.');
    }, delay);
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
