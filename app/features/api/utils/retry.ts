/**
 * @file retry.ts
 * @summary リトライロジックのユーティリティ
 * @responsibility API呼び出しのリトライ機能を提供
 */

import { RetryConfig } from '../types';
import { logger } from '../../../utils/logger';

/**
 * デフォルトのリトライ設定
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * リトライ可能なエラーかどうかを判定
 */
export function isRetryableError(error: any, config: RetryConfig): boolean {
  // ネットワークエラー
  if (!error.response) {
    return true;
  }

  // ステータスコードベースの判定
  const status = error.response?.status;
  if (status && config.retryableStatusCodes) {
    return config.retryableStatusCodes.includes(status);
  }

  return false;
}

/**
 * リトライ遅延時間を計算
 */
export function calculateRetryDelay(
  attempt: number,
  baseDelay: number,
  exponentialBackoff: boolean = true
): number {
  if (exponentialBackoff) {
    return baseDelay * Math.pow(2, attempt);
  }
  return baseDelay;
}

/**
 * 遅延を伴う待機
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * リトライ機能付きで関数を実行
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: string = 'api'
): Promise<T> {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: any;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        logger.info(context, `Retry attempt ${attempt}/${finalConfig.maxRetries}`);
      }

      return await fn();
    } catch (error) {
      lastError = error;

      // 最後の試行の場合はリトライしない
      if (attempt >= finalConfig.maxRetries) {
        logger.error(context, `Max retries (${finalConfig.maxRetries}) exceeded`, error);
        break;
      }

      // リトライ可能なエラーかチェック
      if (!isRetryableError(error, finalConfig)) {
        logger.warn(context, 'Non-retryable error, aborting retry', error);
        throw error;
      }

      // リトライ前に待機
      const delayMs = calculateRetryDelay(
        attempt,
        finalConfig.retryDelay,
        finalConfig.exponentialBackoff
      );
      logger.debug(context, `Waiting ${delayMs}ms before retry...`);
      await delay(delayMs);
    }
  }

  throw lastError;
}
