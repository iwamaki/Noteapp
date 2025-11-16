/**
 * @file HttpClient.ts
 * @summary 共通HTTP通信クライアント
 * @responsibility セキュアで一貫性のあるHTTP通信を提供
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getAuthHeaders } from '../../../auth/authApiClient';
import { logger } from '../../../utils/logger';
import { ApiRequestConfig, ApiResponse } from '../types';
import { withRetry } from '../utils/retry';
import { ApiErrorHandler } from '../services/ApiErrorHandler';

/**
 * HttpClient設定
 */
export interface HttpClientConfig {
  /** ベースURL */
  baseUrl: string;
  /** デフォルトタイムアウト（ミリ秒） */
  timeout?: number;
  /** 認証ヘッダーを自動的に含めるか */
  includeAuth?: boolean;
  /** ログのコンテキスト名 */
  logContext?: string;
}

/**
 * 共通HTTPクライアント
 *
 * 特徴:
 * - 認証ヘッダーの自動追加
 * - タイムアウト管理
 * - リトライ機能
 * - 統一されたエラーハンドリング
 * - ログ記録
 */
export class HttpClient {
  private axiosInstance: AxiosInstance;
  private timeout: number;
  private includeAuth: boolean;
  private errorHandler: ApiErrorHandler;
  private logContext: string;

  constructor(config: HttpClientConfig) {
    this.timeout = config.timeout || 30000;
    this.includeAuth = config.includeAuth !== false;
    this.logContext = config.logContext || 'httpClient';
    this.errorHandler = new ApiErrorHandler(this.logContext);

    // Axiosインスタンスを作成
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // リクエストインターセプター
    this.axiosInstance.interceptors.request.use(
      async (requestConfig) => {
        logger.debug(
          this.logContext,
          `Request: ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`
        );

        // 認証ヘッダーを自動追加
        if (this.includeAuth) {
          try {
            const authHeaders = await getAuthHeaders();
            Object.assign(requestConfig.headers, authHeaders);
          } catch (error) {
            logger.warn(this.logContext, 'Failed to get auth headers', error);
          }
        }

        return requestConfig;
      },
      (error) => {
        logger.error(this.logContext, 'Request interceptor error', error);
        return Promise.reject(error);
      }
    );

    // レスポンスインターセプター
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(
          this.logContext,
          `Response: ${response.status} ${response.config.url}`
        );
        return response;
      },
      (error) => {
        logger.error(
          this.logContext,
          `Response error: ${error.message}`,
          error.response?.data
        );
        return Promise.reject(error);
      }
    );
  }

  /**
   * GETリクエスト
   */
  async get<T = any>(
    url: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const axiosConfig = this.buildAxiosConfig(config);
      const response = await this.executeRequest<T>(() =>
        this.axiosInstance.get<T>(url, axiosConfig)
      , config);
      return this.transformResponse(response);
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }

  /**
   * POSTリクエスト
   */
  async post<T = any, D = any>(
    url: string,
    data?: D,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const axiosConfig = this.buildAxiosConfig(config);
      const response = await this.executeRequest<T>(() =>
        this.axiosInstance.post<T>(url, data, axiosConfig)
      , config);
      return this.transformResponse(response);
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }

  /**
   * PUTリクエスト
   */
  async put<T = any, D = any>(
    url: string,
    data?: D,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const axiosConfig = this.buildAxiosConfig(config);
      const response = await this.executeRequest<T>(() =>
        this.axiosInstance.put<T>(url, data, axiosConfig)
      , config);
      return this.transformResponse(response);
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }

  /**
   * PATCHリクエスト
   */
  async patch<T = any, D = any>(
    url: string,
    data?: D,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const axiosConfig = this.buildAxiosConfig(config);
      const response = await this.executeRequest<T>(() =>
        this.axiosInstance.patch<T>(url, data, axiosConfig)
      , config);
      return this.transformResponse(response);
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }

  /**
   * DELETEリクエスト
   */
  async delete<T = any>(
    url: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const axiosConfig = this.buildAxiosConfig(config);
      const response = await this.executeRequest<T>(() =>
        this.axiosInstance.delete<T>(url, axiosConfig)
      , config);
      return this.transformResponse(response);
    } catch (error) {
      throw this.errorHandler.handle(error);
    }
  }

  /**
   * リクエストを実行（タイムアウト、リトライ付き）
   */
  private async executeRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    config?: ApiRequestConfig
  ): Promise<AxiosResponse<T>> {
    const timeout = config?.timeout || this.timeout;

    // タイムアウト処理
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), timeout);
    });

    // リトライ設定がある場合はリトライ付きで実行
    if (config?.retry) {
      return withRetry(
        () => Promise.race([requestFn(), timeoutPromise]),
        config.retry,
        this.logContext
      );
    }

    // リトライなしで実行
    return Promise.race([requestFn(), timeoutPromise]);
  }

  /**
   * Axios設定をビルド
   */
  private buildAxiosConfig(config?: ApiRequestConfig): AxiosRequestConfig {
    const axiosConfig: AxiosRequestConfig = {};

    if (config?.headers) {
      axiosConfig.headers = config.headers;
    }

    if (config?.timeout) {
      axiosConfig.timeout = config.timeout;
    }

    return axiosConfig;
  }

  /**
   * AxiosResponseをApiResponseに変換
   */
  private transformResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers as Record<string, string>,
    };
  }

  /**
   * ベースURLを取得
   */
  getBaseUrl(): string {
    return this.axiosInstance.defaults.baseURL || '';
  }

  /**
   * タイムアウト値を取得
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * AxiosInstanceを直接取得（高度な使い方用）
   */
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

/**
 * HttpClientファクトリー関数
 */
export function createHttpClient(config: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}
