/**
 * @file useWebSocket.ts
 * @summary WebSocket接続用カスタムフック
 * @responsibility React コンポーネントでのWebSocket接続を簡単にする
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketClient } from '../clients/WebSocketClient';
import { WebSocketState, WebSocketMessage, WebSocketConfig, WebSocketEventHandlers } from '../types';

/**
 * useWebSocket フックの戻り値
 */
export interface UseWebSocketResult<T = any> {
  /** 接続状態 */
  state: WebSocketState;
  /** 接続中かどうか */
  isConnected: boolean;
  /** メッセージを送信 */
  send: (message: WebSocketMessage<T>) => boolean;
  /** 接続 */
  connect: () => void;
  /** 切断 */
  disconnect: () => void;
  /** クライアントインスタンス */
  client: WebSocketClient<T> | null;
}

/**
 * useWebSocket フックのオプション
 */
export interface UseWebSocketOptions<T = any> {
  /** WebSocket設定 */
  config?: Partial<WebSocketConfig>;
  /** イベントハンドラー */
  eventHandlers?: WebSocketEventHandlers<T>;
  /** ログのコンテキスト名 */
  logContext?: string;
  /** マウント時に自動接続するか */
  autoConnect?: boolean;
  /** アンマウント時に自動切断するか */
  autoDisconnect?: boolean;
}

/**
 * WebSocket接続用フック
 *
 * 使用例:
 * ```tsx
 * const { state, isConnected, send } = useWebSocket(
 *   'ws://localhost:8000/ws/client-123',
 *   {
 *     eventHandlers: {
 *       onMessage: (message) => {
 *         console.log('Received:', message);
 *       },
 *     },
 *     autoConnect: true,
 *   }
 * );
 *
 * // メッセージを送信
 * send({ type: 'chat', data: 'Hello' });
 * ```
 */
export function useWebSocket<T = any>(
  url: string,
  options: UseWebSocketOptions<T> = {}
): UseWebSocketResult<T> {
  const {
    config,
    eventHandlers,
    logContext = 'websocket',
    autoConnect = false,
    autoDisconnect = true,
  } = options;

  const [state, setState] = useState<WebSocketState>(WebSocketState.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);

  // WebSocketクライアントインスタンスを保持
  const clientRef = useRef<WebSocketClient<T> | null>(null);

  // クライアントを初期化
  useEffect(() => {
    if (!clientRef.current) {
      // ステート変更ハンドラーを追加
      const handlers: WebSocketEventHandlers<T> = {
        ...eventHandlers,
        onStateChange: (newState) => {
          setState(newState);
          setIsConnected(newState === WebSocketState.CONNECTED);

          // カスタムハンドラーも呼び出す
          if (eventHandlers?.onStateChange) {
            eventHandlers.onStateChange(newState);
          }
        },
      };

      clientRef.current = new WebSocketClient<T>(
        url,
        config,
        handlers,
        logContext
      );
    }

    // 自動接続
    if (autoConnect && clientRef.current) {
      clientRef.current.connect();
    }

    // クリーンアップ
    return () => {
      if (autoDisconnect && clientRef.current) {
        clientRef.current.disconnect();
      }
    };
  }, [url, autoConnect, autoDisconnect, config, eventHandlers, logContext]);

  // イベントハンドラーが変更された時に更新
  useEffect(() => {
    if (clientRef.current && eventHandlers) {
      clientRef.current.updateEventHandlers(eventHandlers);
    }
  }, [eventHandlers]);

  // メッセージを送信
  const send = useCallback((message: WebSocketMessage<T>): boolean => {
    if (!clientRef.current) {
      return false;
    }
    return clientRef.current.send(message);
  }, []);

  // 接続
  const connect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.connect();
    }
  }, []);

  // 切断
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect();
    }
  }, []);

  return {
    state,
    isConnected,
    send,
    connect,
    disconnect,
    client: clientRef.current,
  };
}

/**
 * WebSocket接続状態を監視するフック
 *
 * 使用例:
 * ```tsx
 * const isOnline = useWebSocketState(client, WebSocketState.CONNECTED);
 * ```
 */
export function useWebSocketState(
  client: WebSocketClient | null,
  targetState: WebSocketState
): boolean {
  const [isInState, setIsInState] = useState(false);

  useEffect(() => {
    if (!client) {
      setIsInState(false);
      return;
    }

    // 初期状態をチェック
    setIsInState(client.getState() === targetState);

    // ステート変更リスナーを登録
    const listener = (newState: WebSocketState) => {
      setIsInState(newState === targetState);
    };

    client.addStateListener(listener);

    return () => {
      client.removeStateListener(listener);
    };
  }, [client, targetState]);

  return isInState;
}
