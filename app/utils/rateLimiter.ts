/**
 * @file rateLimiter.ts
 * @description クライアント側のRate Limiterユーティリティ
 *
 * API呼び出しをスロットリングして、過剰なリクエストを防ぎます。
 * バックエンドのRate Limitingと連携して、より強固なDoS防御を提供します。
 */

import { logger } from './logger';

/**
 * Rate Limiterクラス
 *
 * スライディングウィンドウ方式でリクエスト頻度を制限します。
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  /**
   * レート制限をチェック
   *
   * @param key - 制限を識別するキー（通常はエンドポイントパス）
   * @param maxRequests - ウィンドウ内の最大リクエスト数
   * @param windowMs - タイムウィンドウ（ミリ秒）
   * @returns リクエストが許可される場合true、制限を超えた場合false
   *
   * @example
   * ```typescript
   * const limiter = new RateLimiter();
   *
   * // 1分間に10リクエストまで許可
   * const canProceed = await limiter.checkLimit('/api/auth/register', 10, 60000);
   *
   * if (!canProceed) {
   *   throw new Error('Too many requests. Please try again later.');
   * }
   * ```
   */
  async checkLimit(
    key: string,
    maxRequests: number,
    windowMs: number
  ): Promise<boolean> {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];

    // 期限切れのタイムスタンプを削除（スライディングウィンドウ）
    const validTimestamps = timestamps.filter(t => now - t < windowMs);

    // レート制限チェック
    if (validTimestamps.length >= maxRequests) {
      const oldestTimestamp = Math.min(...validTimestamps);
      const waitTimeMs = windowMs - (now - oldestTimestamp);

      logger.warn('security', 'Rate limit exceeded', {
        key,
        maxRequests,
        windowMs,
        currentRequests: validTimestamps.length,
        waitTimeMs: Math.ceil(waitTimeMs / 1000), // 秒単位
      });

      return false; // Rate limit exceeded
    }

    // 新しいタイムスタンプを追加
    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);

    return true;
  }

  /**
   * 特定のキーの制限をクリア
   *
   * @param key - クリアするキー
   */
  clear(key: string): void {
    this.requests.delete(key);
  }

  /**
   * すべての制限をクリア
   */
  clearAll(): void {
    this.requests.clear();
  }

  /**
   * 残りの許可リクエスト数を取得
   *
   * @param key - チェックするキー
   * @param maxRequests - 最大リクエスト数
   * @param windowMs - タイムウィンドウ（ミリ秒）
   * @returns 残りの許可リクエスト数
   */
  getRemainingRequests(
    key: string,
    maxRequests: number,
    windowMs: number
  ): number {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter(t => now - t < windowMs);

    return Math.max(0, maxRequests - validTimestamps.length);
  }
}

/**
 * グローバルRate Limiterインスタンス
 */
export const rateLimiter = new RateLimiter();

/**
 * Rate Limiter設定（エンドポイント別）
 */
export const RATE_LIMIT_CONFIG = {
  // 認証エンドポイント
  '/api/auth/register': { maxRequests: 10, windowMs: 60000 }, // 10/分
  '/api/auth/verify': { maxRequests: 20, windowMs: 60000 },   // 20/分
  '/api/auth/refresh': { maxRequests: 20, windowMs: 60000 },  // 20/分
  '/api/auth/devices': { maxRequests: 30, windowMs: 60000 },  // 30/分

  // チャットエンドポイント
  '/api/chat': { maxRequests: 60, windowMs: 60000 },          // 60/分

  // その他のエンドポイント（デフォルト）
  default: { maxRequests: 100, windowMs: 60000 },             // 100/分
} as const;

/**
 * Rate Limit付きでAPIを呼び出す
 *
 * @param endpoint - エンドポイントパス
 * @param fetchFn - 実際のfetch関数
 * @returns fetchFnの結果
 * @throws Rate limit超過時にエラーをスロー
 *
 * @example
 * ```typescript
 * const response = await callWithRateLimit('/api/auth/register', async () => {
 *   return fetch('https://api.example.com/api/auth/register', {
 *     method: 'POST',
 *     body: JSON.stringify(data),
 *   });
 * });
 * ```
 */
export async function callWithRateLimit<T>(
  endpoint: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  // 設定を取得（マッチするものがなければデフォルト）
  const config = RATE_LIMIT_CONFIG[endpoint as keyof typeof RATE_LIMIT_CONFIG]
    || RATE_LIMIT_CONFIG.default;

  const { maxRequests, windowMs } = config;

  // Rate limitチェック
  const canProceed = await rateLimiter.checkLimit(endpoint, maxRequests, windowMs);

  if (!canProceed) {
    const remaining = rateLimiter.getRemainingRequests(endpoint, maxRequests, windowMs);
    const waitTimeSeconds = Math.ceil(windowMs / 1000);

    throw new Error(
      `Rate limit exceeded for ${endpoint}. ` +
      `Please try again in ${waitTimeSeconds} seconds. ` +
      `(${remaining}/${maxRequests} requests remaining)`
    );
  }

  // API呼び出し
  return fetchFn();
}
