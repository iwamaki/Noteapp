/**
 * @file RequestManager.ts
 * @summary リクエスト管理とレート制限
 * @responsibility リクエストのライフサイクル管理、レート制限、リクエストトラッキング
 */

import { loggerConfig } from '../../../utils/loggerConfig';

export interface RequestManagerConfig {
  minRequestInterval?: number; // ミリ秒
}

/**
 * リクエスト管理クラス
 */
export class RequestManager {
  private requestCounter: number = 0;
  private pendingRequests: Set<number> = new Set();
  private lastRequestTime: number = 0;
  private minRequestInterval: number;

  constructor(config: RequestManagerConfig = {}) {
    this.minRequestInterval = config.minRequestInterval ?? 100;
  }

  /**
   * 新しいリクエストを開始
   * @returns リクエストID
   */
  async startRequest(): Promise<number> {
    const requestId = ++this.requestCounter;

    // レート制限チェック
    await this.enforceRateLimit(requestId);

    // 既存の保留中リクエストがある場合は警告してクリア
    if (this.pendingRequests.size > 0) {
      loggerConfig.warn('llm', `Warning: There are ${this.pendingRequests.size} pending requests`);
      this.pendingRequests.clear();
    }

    this.pendingRequests.add(requestId);
    this.lastRequestTime = Date.now();

    loggerConfig.info('llm', `Request #${requestId} started. Pending requests: ${this.pendingRequests.size}`);

    return requestId;
  }

  /**
   * リクエストを終了
   */
  endRequest(requestId: number): void {
    this.pendingRequests.delete(requestId);
    loggerConfig.debug('llm', `Request #${requestId} - Removed from pending. Remaining: ${this.pendingRequests.size}`);
  }

  /**
   * 保留中のリクエスト数を取得
   */
  getPendingCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * レート制限を適用
   */
  private async enforceRateLimit(requestId: number): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (this.lastRequestTime > 0 && timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      loggerConfig.debug('llm', `Request #${requestId} - Waiting ${delay}ms before sending (rate limiting)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * リクエストカウンターを取得（デバッグ用）
   */
  getRequestCounter(): number {
    return this.requestCounter;
  }
}
