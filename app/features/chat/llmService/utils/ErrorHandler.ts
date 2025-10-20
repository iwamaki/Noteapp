/**
 * @file ErrorHandler.ts
 * @summary エラー変換とハンドリング
 * @responsibility axiosエラーをLLMErrorに変換し、適切なエラーメッセージを生成
 */

import axios from 'axios';
import { LLMError } from '../types/LLMError';
import { logger } from '../../../../utils/logger';

/**
 * エラーハンドリングクラス
 */
export class ErrorHandler {
  /**
   * エラーをLLMErrorに変換
   */
  static handleError(error: unknown, requestId: number, apiTimeout: number): never {
    logger.error('llm', `Request #${requestId} - Error occurred:`, error);

    // 既にLLMErrorの場合はそのままスロー
    if (error instanceof LLMError) {
      throw error;
    }

    // タイムアウトエラー
    if (error instanceof Error && error.message === 'TIMEOUT') {
      throw new LLMError(
        `リクエストがタイムアウトしました (${apiTimeout / 1000}秒)`,
        'TIMEOUT_ERROR'
      );
    }

    // Axiosエラーの詳細なハンドリング
    if (axios.isAxiosError(error)) {
      this.handleAxiosError(error, requestId, apiTimeout);
    }

    // TypeErrorでfetchが含まれる場合
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new LLMError('ネットワークエラーが発生しました', 'NETWORK_ERROR');
    }

    // その他の予期しないエラー
    throw new LLMError(
      `予期しないエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
      'UNKNOWN_ERROR'
    );
  }

  /**
   * Axiosエラーを処理
   */
  private static handleAxiosError(error: any, requestId: number, apiTimeout: number): never {
    logger.debug('llm', `Request #${requestId} - Axios error details:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      hasRequest: !!error.request,
      hasResponse: !!error.response,
    });

    // 接続タイムアウト
    if (error.code === 'ECONNABORTED') {
      throw new LLMError(
        `リクエストがタイムアウトしました (${apiTimeout / 1000}秒)`,
        'TIMEOUT_ERROR'
      );
    }

    // サーバーがエラーレスポンスを返した
    if (error.response) {
      throw new LLMError(
        `サーバーエラー: ${error.response.status} - ${error.response.statusText}`,
        'HTTP_ERROR',
        error.response.status
      );
    }

    // リクエストは送信されたがレスポンスがない
    if (error.request) {
      throw new LLMError(
        'サーバーから応答がありません。ネットワーク接続を確認してください。',
        'NETWORK_ERROR'
      );
    }

    // リクエストの設定中にエラーが発生
    throw new LLMError(
      `リクエストエラー: ${error.message}`,
      'REQUEST_SETUP_ERROR'
    );
  }
}
