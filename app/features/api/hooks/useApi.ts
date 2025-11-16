/**
 * @file useApi.ts
 * @summary HTTP API呼び出し用カスタムフック
 * @responsibility React コンポーネントでのAPI呼び出しを簡単にする
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { HttpClient } from '../clients/HttpClient';
import { ApiRequestConfig, ApiResponse, ApiError } from '../types';

/**
 * API呼び出しの状態
 */
export interface ApiState<T> {
  /** データ */
  data: T | null;
  /** ローディング中 */
  loading: boolean;
  /** エラー */
  error: ApiError | null;
  /** 実行済みか */
  called: boolean;
}

/**
 * useApi フックの戻り値
 */
export interface UseApiResult<T, D = any> {
  /** 現在の状態 */
  state: ApiState<T>;
  /** API呼び出しを実行 */
  execute: (data?: D, config?: ApiRequestConfig) => Promise<ApiResponse<T> | null>;
  /** 状態をリセット */
  reset: () => void;
}

/**
 * useApi フックのオプション
 */
export interface UseApiOptions<T> {
  /** マウント時に自動実行するか */
  immediate?: boolean;
  /** 成功時のコールバック */
  onSuccess?: (data: T) => void;
  /** エラー時のコールバック */
  onError?: (error: ApiError) => void;
}

/**
 * HTTP API呼び出し用フック
 *
 * 使用例:
 * ```tsx
 * const { state, execute } = useApi(
 *   httpClient,
 *   (client, data) => client.post('/api/users', data),
 *   { immediate: false }
 * );
 * ```
 */
export function useApi<T, D = any>(
  client: HttpClient,
  apiFn: (client: HttpClient, data?: D, config?: ApiRequestConfig) => Promise<ApiResponse<T>>,
  options: UseApiOptions<T> = {}
): UseApiResult<T, D> {
  const { immediate = false, onSuccess, onError } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
    called: false,
  });

  // マウント状態を追跡
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // API呼び出しを実行
  const execute = useCallback(
    async (data?: D, config?: ApiRequestConfig): Promise<ApiResponse<T> | null> => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        called: true,
      }));

      try {
        const response = await apiFn(client, data, config);

        // アンマウントされている場合は状態を更新しない
        if (!isMountedRef.current) {
          return null;
        }

        setState({
          data: response.data,
          loading: false,
          error: null,
          called: true,
        });

        // 成功コールバック
        if (onSuccess) {
          onSuccess(response.data);
        }

        return response;
      } catch (error) {
        // アンマウントされている場合は状態を更新しない
        if (!isMountedRef.current) {
          return null;
        }

        const apiError = error as ApiError;
        setState({
          data: null,
          loading: false,
          error: apiError,
          called: true,
        });

        // エラーコールバック
        if (onError) {
          onError(apiError);
        }

        return null;
      }
    },
    [client, apiFn, onSuccess, onError]
  );

  // 状態をリセット
  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      called: false,
    });
  }, []);

  // 即座に実行
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate, execute]);

  return {
    state,
    execute,
    reset,
  };
}

/**
 * GETリクエスト専用フック
 */
export function useGet<T>(
  client: HttpClient,
  url: string,
  options: UseApiOptions<T> & { config?: ApiRequestConfig } = {}
): UseApiResult<T, never> {
  const { config, ...restOptions } = options;

  return useApi<T, never>(
    client,
    (client) => client.get<T>(url, config),
    restOptions
  );
}

/**
 * POSTリクエスト専用フック
 */
export function usePost<T, D = any>(
  client: HttpClient,
  url: string,
  options: UseApiOptions<T> & { config?: ApiRequestConfig } = {}
): UseApiResult<T, D> {
  const { config, ...restOptions } = options;

  return useApi<T, D>(
    client,
    (client, data) => client.post<T, D>(url, data, config),
    restOptions
  );
}

/**
 * PUTリクエスト専用フック
 */
export function usePut<T, D = any>(
  client: HttpClient,
  url: string,
  options: UseApiOptions<T> & { config?: ApiRequestConfig } = {}
): UseApiResult<T, D> {
  const { config, ...restOptions } = options;

  return useApi<T, D>(
    client,
    (client, data) => client.put<T, D>(url, data, config),
    restOptions
  );
}

/**
 * DELETEリクエスト専用フック
 */
export function useDelete<T>(
  client: HttpClient,
  url: string,
  options: UseApiOptions<T> & { config?: ApiRequestConfig } = {}
): UseApiResult<T, never> {
  const { config, ...restOptions } = options;

  return useApi<T, never>(
    client,
    (client) => client.delete<T>(url, config),
    restOptions
  );
}
