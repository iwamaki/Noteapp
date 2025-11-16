/**
 * @file api.types.ts
 * @summary 共通API型定義
 * @responsibility アプリケーション全体で使用するAPI関連の型を定義
 */

/**
 * HTTP メソッド
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * API リクエスト設定
 */
export interface ApiRequestConfig {
  /** タイムアウト（ミリ秒） */
  timeout?: number;
  /** 追加ヘッダー */
  headers?: Record<string, string>;
  /** クエリパラメータ */
  params?: Record<string, any>;
  /** リトライ設定 */
  retry?: RetryConfig;
  /** 認証ヘッダーを含めるか（デフォルト: true） */
  includeAuth?: boolean;
}

/**
 * リトライ設定
 */
export interface RetryConfig {
  /** 最大リトライ回数 */
  maxRetries: number;
  /** リトライ間隔（ミリ秒） */
  retryDelay: number;
  /** 指数バックオフを使用するか */
  exponentialBackoff?: boolean;
  /** リトライ可能なステータスコード */
  retryableStatusCodes?: number[];
}

/**
 * API レスポンス
 */
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * API エラー
 */
export interface ApiError {
  message: string;
  status?: number;
  statusText?: string;
  code?: string;
  details?: any;
  response?: {
    data?: any;
    status?: number;
    statusText?: string;
  };
}

/**
 * WebSocket メッセージ
 */
export interface WebSocketMessage<T = any> {
  type: string;
  data?: T;
  [key: string]: any;
}

/**
 * WebSocket 接続状態
 */
export enum WebSocketState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

/**
 * WebSocket 設定
 */
export interface WebSocketConfig {
  /** 最大再接続試行回数 */
  maxReconnectAttempts: number;
  /** 再接続遅延（ミリ秒） */
  reconnectDelay: number;
  /** ハートビート間隔（ミリ秒） */
  heartbeatInterval: number;
  /** ハートビートタイムアウト（ミリ秒） */
  heartbeatTimeout: number;
  /** タイムアウトチェック間隔（ミリ秒） */
  timeoutCheckInterval: number;
}

/**
 * WebSocket イベントハンドラ
 */
export interface WebSocketEventHandlers<T = any> {
  onOpen?: () => void;
  onMessage?: (message: WebSocketMessage<T>) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onStateChange?: (state: WebSocketState) => void;
}
