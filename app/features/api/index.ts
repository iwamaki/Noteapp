/**
 * @file index.ts
 * @summary 共通APIインフラストラクチャのメインエクスポート
 * @description
 * このモジュールは、アプリケーション全体で使用する共通のAPI通信インフラを提供します。
 *
 * ## 主な機能
 * - セキュアなHTTP通信（認証ヘッダー自動追加）
 * - 安定したWebSocket通信（自動再接続、ハートビート）
 * - 統一されたエラーハンドリング
 * - リトライ機能
 * - React用カスタムフック
 *
 * ## 使用例
 *
 * ### HttpClient
 * ```ts
 * import { createHttpClient } from '@/features/api';
 *
 * const client = createHttpClient({
 *   baseUrl: 'https://api.example.com',
 *   timeout: 30000,
 *   logContext: 'myApi',
 * });
 *
 * const response = await client.get('/users');
 * ```
 *
 * ### WebSocketClient
 * ```ts
 * import { createWebSocketClient } from '@/features/api';
 *
 * const ws = createWebSocketClient('ws://localhost:8000/ws/client-123', {
 *   maxReconnectAttempts: 5,
 *   heartbeatInterval: 30000,
 * });
 *
 * ws.connect();
 * ws.send({ type: 'message', data: 'Hello' });
 * ```
 *
 * ### React Hooks
 * ```tsx
 * import { useApi, useWebSocket } from '@/features/api';
 *
 * function MyComponent() {
 *   const { state, execute } = usePost(client, '/api/users');
 *   const { isConnected, send } = useWebSocket('ws://localhost:8000/ws');
 *
 *   // ...
 * }
 * ```
 */

// クライアント
export {
  HttpClient,
  createHttpClient,
  type HttpClientConfig,
} from './clients/HttpClient';

export {
  WebSocketClient,
  createWebSocketClient,
  DEFAULT_WEBSOCKET_CONFIG,
} from './clients/WebSocketClient';

// フック
export {
  useApi,
  useGet,
  usePost,
  usePut,
  useDelete,
  type UseApiResult,
  type UseApiOptions,
  type ApiState,
} from './hooks/useApi';

export {
  useWebSocket,
  useWebSocketState,
  type UseWebSocketResult,
  type UseWebSocketOptions,
} from './hooks/useWebSocket';

// サービス
export {
  ApiErrorHandler,
  defaultErrorHandler,
  transformError,
  transformAxiosError,
  isApiError,
  getUserFriendlyErrorMessage,
} from './services/ApiErrorHandler';

// ユーティリティ
export {
  withRetry,
  isRetryableError,
  calculateRetryDelay,
  delay,
  DEFAULT_RETRY_CONFIG,
} from './utils/retry';

// 型定義
export type {
  HttpMethod,
  ApiRequestConfig,
  ApiResponse,
  ApiError,
  RetryConfig,
  WebSocketMessage,
  WebSocketConfig,
  WebSocketEventHandlers,
} from './types';

export { WebSocketState } from './types';
