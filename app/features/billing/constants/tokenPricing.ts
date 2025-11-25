/**
 * @file tokenPricing.ts
 * @summary トークン販売価格取得（バックエンド経由）
 * @description
 * クレジット→トークン変換時に使用する販売価格をバックエンドから取得。
 * すべての価格情報はバックエンドが唯一の情報源（Single Source of Truth）。
 */

import { logger } from '../../../utils/logger';

/**
 * モデルIDから販売価格を取得（バックエンドキャッシュ経由）
 *
 * ⚠️ 重要: この関数は同期的に動作するため、事前にバックエンドから価格情報を
 * 取得してキャッシュしておく必要があります。
 *
 * キャッシュは以下のタイミングで更新されます：
 * 1. アプリ起動時（initBillingApiService）
 * 2. 価格情報取得時（billingApiService.getPricing()）
 *
 * @param modelId モデルID
 * @returns 販売価格（円/M tokens）、存在しない場合は undefined
 */
export function getTokenPrice(modelId: string): number | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const APIService = require('../../llmService/api').default;
    const providers = APIService.getCachedLLMProviders();

    if (providers) {
      // すべてのプロバイダーから価格情報を検索
      for (const provider of Object.values(providers)) {
        const typedProvider = provider as any;
        if (typedProvider?.modelMetadata?.[modelId]?.pricing) {
          const pricing = typedProvider.modelMetadata[modelId].pricing;
          // バックエンドの価格を使用（selling_priceJPY フィールド）
          if (pricing.sellingPriceJPY !== undefined) {
            return pricing.sellingPriceJPY;
          }
        }
      }
    }
  } catch (error) {
    logger.error('billing', 'Failed to get price from backend cache', { error });
  }

  // 価格情報が見つからない場合はundefinedを返す
  logger.warn('billing', 'No pricing information found for model', { modelId });
  return undefined;
}

/**
 * クレジット（円）をトークン数に変換
 * @param modelId モデルID
 * @param credits クレジット額（円）
 * @returns トークン数、価格情報がない場合は 0
 */
export function creditsToTokens(modelId: string, credits: number): number {
  const pricePerMToken = getTokenPrice(modelId);
  if (!pricePerMToken || credits <= 0) return 0;

  return Math.floor((credits / pricePerMToken) * 1_000_000);
}

