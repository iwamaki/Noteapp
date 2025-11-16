/**
 * @file billingApiService.ts
 * @summary Backend billing API service layer
 * @description
 * TypeScript service layer for communicating with the backend billing API.
 * Replaces local AsyncStorage-based token management with server-side validation.
 */

import { createHttpClient, HttpClient, ApiError } from '../../features/api';
import { logger } from '../../utils/logger';

// ======================
// Type Definitions
// ======================

export interface TokenBalance {
  credits: number;
  allocatedTokens: Record<string, number>;
}

export interface PurchaseRecord {
  productId: string;
  purchaseToken: string;
  transactionId: string;
  purchaseDate: string;
  amount: number;
  creditsAdded: number;
}

export interface Allocation {
  modelId: string;
  credits: number;
}

export interface Transaction {
  id: number;
  type: string;
  amount: number;
  modelId?: string;
  createdAt: string;
}

export interface PricingInfo {
  pricePerMToken: number;
  category: 'quick' | 'think';
}

export interface PricingResponse {
  pricing: Record<string, PricingInfo>;
}

export interface ConsumeTokensResponse {
  success: boolean;
  remainingTokens: number;
}

export interface CategoryBalanceResponse {
  category: string;
  totalTokens: number;
}

// ======================
// Billing API Service
// ======================

export class BillingApiService {
  private client: HttpClient;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;

    // 共通HttpClientを使用（認証ヘッダー自動追加、ログ記録、リトライ機能付き）
    this.client = createHttpClient({
      baseUrl: `${baseUrl}/api/billing`,
      timeout: 10000,
      includeAuth: true,
      logContext: 'billingApi',
    });
  }

  /**
   * トークン残高取得
   * GET /api/billing/balance
   */
  async getBalance(): Promise<TokenBalance> {
    try {
      const response = await this.client.get<any>('/balance');
      logger.info('billingApi', 'Balance fetched', response.data);

      // バックエンドのsnake_caseをcamelCaseに変換
      return {
        credits: response.data.credits || 0,
        allocatedTokens: response.data.allocated_tokens || {},
      };
    } catch (error) {
      logger.error('billingApi', 'Failed to get balance', error);
      throw this.handleError(error, 'トークン残高の取得に失敗しました');
    }
  }

  /**
   * クレジット追加（購入時）
   * POST /api/billing/credits/add
   */
  async addCredits(credits: number, purchaseRecord: PurchaseRecord): Promise<void> {
    try {
      await this.client.post('/credits/add', {
        credits,
        purchase_record: purchaseRecord,
      });
      logger.info('billingApi', `Added ${credits} credits`);
    } catch (error) {
      logger.error('billingApi', 'Failed to add credits', error);
      throw this.handleError(error, 'クレジットの追加に失敗しました');
    }
  }

  /**
   * クレジット配分
   * POST /api/billing/credits/allocate
   */
  async allocateCredits(allocations: Allocation[]): Promise<void> {
    try {
      // フロントエンドのcamelCaseをバックエンドのsnake_caseに変換
      const backendAllocations = allocations.map(alloc => ({
        model_id: alloc.modelId,
        credits: alloc.credits,
      }));

      await this.client.post('/credits/allocate', {
        allocations: backendAllocations,
      });
      logger.info('billingApi', 'Credits allocated', allocations);
    } catch (error) {
      logger.error('billingApi', 'Failed to allocate credits', error);
      throw this.handleError(error, 'クレジットの配分に失敗しました');
    }
  }

  /**
   * トークン消費
   * POST /api/billing/tokens/consume
   */
  async consumeTokens(
    modelId: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<ConsumeTokensResponse> {
    try {
      const response = await this.client.post<ConsumeTokensResponse>('/tokens/consume', {
        model_id: modelId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      });
      logger.info('billingApi', `Consumed tokens for ${modelId}`, {
        input: inputTokens,
        output: outputTokens,
        remaining: response.data.remainingTokens,
      });
      return response.data;
    } catch (error) {
      logger.error('billingApi', 'Failed to consume tokens', error);
      throw this.handleError(error, 'トークンの消費に失敗しました');
    }
  }

  /**
   * 取引履歴取得
   * GET /api/billing/transactions
   */
  async getTransactions(limit: number = 100): Promise<Transaction[]> {
    try {
      const response = await this.client.get<Transaction[]>('/transactions', {
        params: { limit },
      });
      logger.info('billingApi', `Fetched ${response.data.length} transactions`);
      return response.data;
    } catch (error) {
      logger.error('billingApi', 'Failed to get transactions', error);
      throw this.handleError(error, '取引履歴の取得に失敗しました');
    }
  }

  /**
   * 価格情報取得
   * GET /api/billing/pricing
   */
  async getPricing(): Promise<PricingResponse> {
    try {
      const response = await this.client.get<PricingResponse>('/pricing');
      logger.info('billingApi', 'Pricing info fetched');
      return response.data;
    } catch (error) {
      logger.error('billingApi', 'Failed to get pricing', error);
      throw this.handleError(error, '価格情報の取得に失敗しました');
    }
  }

  /**
   * カテゴリー別トークン合計取得
   * GET /api/billing/balance/category/{category}
   */
  async getCategoryBalance(category: 'quick' | 'think'): Promise<number> {
    try {
      const response = await this.client.get<CategoryBalanceResponse>(
        `/balance/category/${category}`
      );
      logger.info('billingApi', `Category balance: ${category} = ${response.data.totalTokens}`);
      return response.data.totalTokens;
    } catch (error) {
      logger.error('billingApi', 'Failed to get category balance', error);
      throw this.handleError(error, 'カテゴリー別残高の取得に失敗しました');
    }
  }

  /**
   * 全データリセット（デバッグ用）
   * POST /api/billing/reset
   */
  async resetAllData(): Promise<void> {
    try {
      await this.client.post('/reset');
      logger.info('billingApi', 'All data reset successfully');
    } catch (error) {
      logger.error('billingApi', 'Failed to reset all data', error);
      throw this.handleError(error, 'データのリセットに失敗しました');
    }
  }

  /**
   * エラーハンドリング（共通ApiErrorを使用）
   */
  private handleError(error: unknown, defaultMessage: string): Error {
    // 共通APIエラーとして処理
    const apiError = error as ApiError;

    // バックエンドのdetailメッセージを優先
    const detail = apiError.response?.data?.detail;
    const message = detail || apiError.message || defaultMessage;

    return new Error(message);
  }
}

// ======================
// Singleton Instance
// ======================

let billingApiService: BillingApiService | null = null;

/**
 * BillingApiService を初期化
 * アプリ起動時に一度だけ呼び出す
 */
export function initBillingApiService(backendUrl: string): void {
  if (billingApiService) {
    logger.warn('billingApi', 'BillingApiService already initialized');
    return;
  }

  billingApiService = new BillingApiService(backendUrl);
  logger.info('billingApi', `BillingApiService initialized with URL: ${backendUrl}`);
}

/**
 * BillingApiService のインスタンスを取得
 * @throws 初期化されていない場合はエラー
 */
export function getBillingApiService(): BillingApiService {
  if (!billingApiService) {
    throw new Error(
      'BillingApiService not initialized. Call initBillingApiService() first.'
    );
  }
  return billingApiService;
}

/**
 * BillingApiService が初期化されているかチェック
 */
export function isBillingApiServiceInitialized(): boolean {
  return billingApiService !== null;
}
