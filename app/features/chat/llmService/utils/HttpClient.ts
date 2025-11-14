/**
 * @file HttpClient.ts
 * @summary HTTP通信の抽象化層
 * @responsibility axios の実装詳細をカプセル化し、タイムアウト管理を提供
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { getAuthHeaders } from '../../../../auth/authApiClient';

export interface HttpClientConfig {
  baseUrl: string;
  timeout: number;
}

/**
 * HTTP通信を担当するクライアントクラス
 */
export class HttpClient {
  private axiosInstance: AxiosInstance;
  private timeout: number;

  constructor(config: HttpClientConfig) {
    this.timeout = config.timeout;
    this.axiosInstance = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // リクエストインターセプターで認証ヘッダーを自動追加
    this.axiosInstance.interceptors.request.use(async (requestConfig) => {
      const authHeaders = await getAuthHeaders();
      requestConfig.headers = {
        ...requestConfig.headers,
        ...authHeaders,
      };
      return requestConfig;
    });
  }

  /**
   * POSTリクエストをタイムアウト制御付きで実行
   */
  async post<T = any, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    const axiosPromise = this.axiosInstance.post<T>(url, data, config);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        reject(new Error('TIMEOUT'));
      }, this.timeout);
    });

    try {
      const response = await Promise.race([axiosPromise, timeoutPromise]);

      // 成功時はタイムアウトをクリア
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      return response;
    } catch (error) {
      // エラー時もタイムアウトをクリア
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      throw error;
    }
  }

  /**
   * GETリクエストを実行
   */
  async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get<T>(url, config);
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
}
