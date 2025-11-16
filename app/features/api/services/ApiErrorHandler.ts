/**
 * @file ApiErrorHandler.ts
 * @summary 統一されたAPIエラーハンドリング
 * @responsibility API呼び出しのエラーを一貫した方法で処理
 */

import axios, { AxiosError } from 'axios';
import { logger } from '../../../utils/logger';
import { ApiError } from '../types';

/**
 * AxiosErrorをApiErrorに変換
 */
export function transformAxiosError(error: AxiosError, context: string = 'api'): ApiError {
  const apiError: ApiError = {
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText,
    code: error.code,
  };

  // レスポンスに詳細情報がある場合は追加
  if (error.response?.data) {
    const data = error.response.data as any;

    // バックエンドからの詳細メッセージ
    if (data.detail) {
      apiError.message = data.detail;
    } else if (data.message) {
      apiError.message = data.message;
    }

    apiError.details = data;
  }

  logger.error(context, 'API Error', {
    status: apiError.status,
    message: apiError.message,
    code: apiError.code,
  });

  return apiError;
}

/**
 * 一般的なエラーをApiErrorに変換
 */
export function transformError(error: unknown, context: string = 'api'): ApiError {
  // すでにApiError形式の場合
  if (isApiError(error)) {
    return error;
  }

  // AxiosErrorの場合
  if (axios.isAxiosError(error)) {
    return transformAxiosError(error, context);
  }

  // タイムアウトエラー
  if (error instanceof Error && error.message === 'TIMEOUT') {
    logger.error(context, 'Request timeout');
    return {
      message: 'リクエストがタイムアウトしました',
      code: 'TIMEOUT',
    };
  }

  // その他のErrorオブジェクト
  if (error instanceof Error) {
    logger.error(context, 'Unexpected error', error);
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    };
  }

  // 不明なエラー
  logger.error(context, 'Unknown error type', error);
  return {
    message: '不明なエラーが発生しました',
    code: 'UNKNOWN_ERROR',
    details: error,
  };
}

/**
 * ApiError型ガード
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

/**
 * ユーザーフレンドリーなエラーメッセージを取得
 */
export function getUserFriendlyErrorMessage(error: ApiError): string {
  // ステータスコード別のメッセージ
  switch (error.status) {
    case 400:
      return '不正なリクエストです';
    case 401:
      return '認証に失敗しました';
    case 403:
      return 'アクセスが拒否されました';
    case 404:
      return 'リソースが見つかりません';
    case 408:
      return 'リクエストがタイムアウトしました';
    case 429:
      return 'リクエストが多すぎます。しばらく待ってから再試行してください';
    case 500:
      return 'サーバーエラーが発生しました';
    case 502:
      return 'ゲートウェイエラーが発生しました';
    case 503:
      return 'サービスが一時的に利用できません';
    case 504:
      return 'ゲートウェイタイムアウトが発生しました';
    default:
      // カスタムメッセージがあればそれを使用
      return error.message || '予期しないエラーが発生しました';
  }
}

/**
 * エラーハンドラークラス
 */
export class ApiErrorHandler {
  private context: string;

  constructor(context: string = 'api') {
    this.context = context;
  }

  /**
   * エラーを処理してApiErrorを返す
   */
  handle(error: unknown): ApiError {
    return transformError(error, this.context);
  }

  /**
   * エラーを処理してユーザーフレンドリーなメッセージを返す
   */
  getUserMessage(error: unknown): string {
    const apiError = this.handle(error);
    return getUserFriendlyErrorMessage(apiError);
  }

  /**
   * エラーをログに記録
   */
  log(error: unknown, additionalContext?: string): void {
    const apiError = this.handle(error);
    const message = additionalContext
      ? `${additionalContext}: ${apiError.message}`
      : apiError.message;

    logger.error(this.context, message, apiError);
  }
}

/**
 * デフォルトのエラーハンドラーインスタンス
 */
export const defaultErrorHandler = new ApiErrorHandler('api');
