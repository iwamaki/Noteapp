/**
 * @file tokenPricing.ts
 * @summary トークン販売価格テーブル（円建て）
 * @description
 * クレジット→トークン変換時に使用する販売価格を定義。
 * この価格は原価（USD）とは独立して自由に調整可能。
 * マージン、為替レート、戦略的価格設定などを反映した最終販売価格。
 */

import { GEMINI_PRICING } from '../../constants/pricing';

/**
 * 💰 価格設定パラメータ
 * ここを変更するだけで全モデルの販売価格が自動計算されます
 */
export const PRICING_CONFIG = {
  /** 為替レート（円/USD） */
  exchangeRate: 150,

  /** マージン率（%） */
  marginPercent: 20,

  /**
   * 入出力トークンの価格比率（入力:出力）
   *
   * 💡 使用パターン別の推奨設定：
   * - 50:50 (0.5) - バランス型（チャット、一般用途）← デフォルト
   * - 30:70 (0.3) - 出力重視（文章生成、コード生成が多い）
   * - 70:30 (0.7) - 入力重視（要約、分類、分析が多い）
   * - 40:60 (0.4) - やや出力重視
   * - 60:40 (0.6) - やや入力重視
   *
   * 📊 影響例（Gemini 2.5 Flash: 入力$0.3、出力$2.5）:
   * - 50:50 → 平均$1.40/M
   * - 30:70 → 平均$1.84/M（出力コスト重視・高め）
   * - 70:30 → 平均$0.96/M（入力コスト重視・安め）
   */
  inputOutputRatio: 0.5,
} as const;

/**
 * 原価（USD）から販売価格（JPY）を自動計算
 */
function calculatePrice(modelId: string): number {
  const pricing = GEMINI_PRICING[modelId];
  if (!pricing) return 0;

  // 入力と出力の加重平均価格を計算
  // inputOutputRatio = 0.5 → 50%入力、50%出力
  // inputOutputRatio = 0.3 → 30%入力、70%出力
  // inputOutputRatio = 0.7 → 70%入力、30%出力
  const avgPriceUSD =
    pricing.inputPricePer1M * PRICING_CONFIG.inputOutputRatio +
    pricing.outputPricePer1M * (1 - PRICING_CONFIG.inputOutputRatio);

  // 円建て原価
  const costJPY = avgPriceUSD * PRICING_CONFIG.exchangeRate;

  // マージンを加えた販売価格
  const sellingPrice = costJPY * (1 + PRICING_CONFIG.marginPercent / 100);

  // 5円単位で四捨五入（価格の見栄えを良くする）
  return Math.round(sellingPrice / 5) * 5;
}

/**
 * トークン販売価格（円/M tokens）
 *
 * 💰 自動計算による価格設定：
 * - 為替レート: ${PRICING_CONFIG.exchangeRate}円/USD
 * - マージン率: ${PRICING_CONFIG.marginPercent}%
 * - 入出力比率: ${(PRICING_CONFIG.inputOutputRatio * 100).toFixed(0)}:${((1 - PRICING_CONFIG.inputOutputRatio) * 100).toFixed(0)}（入力:出力）
 *
 * 📊 現在の価格（自動計算）:
 * - gemini-2.5-flash: ¥${calculatePrice('gemini-2.5-flash')}/M
 * - gemini-2.5-pro: ¥${calculatePrice('gemini-2.5-pro')}/M
 * - gemini-2.0-flash: ¥${calculatePrice('gemini-2.0-flash')}/M
 *
 * 💡 価格調整方法：
 * 1. PRICING_CONFIG.exchangeRate を変更 → 為替レート対応
 * 2. PRICING_CONFIG.marginPercent を変更 → 利益率調整
 * 3. PRICING_CONFIG.inputOutputRatio を変更 → 使用パターンに応じた価格調整
 * 4. 特定モデルのみ手動設定 → 個別の価格を直接指定
 */
export const TOKEN_PRICING_JPY: Record<string, number> = {
  // Quick モデル（高速・低コスト）
  'gemini-2.5-flash': calculatePrice('gemini-2.5-flash'),
  'gemini-2.0-flash': calculatePrice('gemini-2.0-flash'),

  // Think モデル（高性能・複雑タスク向け）
  'gemini-2.5-pro': calculatePrice('gemini-2.5-pro'),
};

/**
 * モデルIDから販売価格を取得
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
  // 🆕 バックエンドから取得した価格を優先（キャッシュ経由）
  try {
    const APIService = require('../../features/chat/llmService/api').default;
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
    console.warn('[Pricing] Failed to get price from backend cache, using fallback', error);
  }

  // ⚠️ フォールバック: ローカルの計算結果（バックエンドと一致するはず）
  // このフォールバックは、初期化前やキャッシュ失敗時のみ使用される
  return TOKEN_PRICING_JPY[modelId];
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

/**
 * トークン数をクレジット（円）に変換
 * @param modelId モデルID
 * @param tokens トークン数
 * @returns クレジット額（円）、価格情報がない場合は 0
 */
export function tokensToCredits(modelId: string, tokens: number): number {
  const pricePerMToken = getTokenPrice(modelId);
  if (!pricePerMToken || tokens <= 0) return 0;

  return Math.floor((tokens / 1_000_000) * pricePerMToken);
}

/**
 * モデルカテゴリー判定
 * バックエンドのメタデータを使用（キャッシュ経由）
 * @param modelId モデルID
 * @returns 'quick' | 'think'
 */
export function getModelCategory(modelId: string): 'quick' | 'think' {
  // 動的インポートでAPIServiceを使用（循環依存を避けるため）
  try {
    const APIService = require('../../features/chat/llmService/api').default;
    return APIService.getModelCategory(modelId);
  } catch (error) {
    // フォールバック: APIServiceが利用できない場合
    console.warn('Failed to get model category from APIService, using fallback', error);
    const modelIdLower = modelId.toLowerCase();
    return (modelIdLower.includes('flash') || modelIdLower.includes('mini')) ? 'quick' : 'think';
  }
}

/**
 * 価格調整用のヘルパー関数
 * 原価からマージンを計算して販売価格を算出
 *
 * @param costUSD 原価（USD/M tokens）
 * @param exchangeRate 為替レート（円/USD）、デフォルトは PRICING_CONFIG.exchangeRate
 * @param marginPercent マージン率（%）、デフォルトは PRICING_CONFIG.marginPercent
 * @returns 販売価格（円/M tokens）
 */
export function calculateSellingPrice(
  costUSD: number,
  exchangeRate: number = PRICING_CONFIG.exchangeRate,
  marginPercent: number = PRICING_CONFIG.marginPercent
): number {
  const costJPY = costUSD * exchangeRate;
  const sellingPrice = costJPY * (1 + marginPercent / 100);
  return Math.round(sellingPrice / 5) * 5; // 5円単位で四捨五入
}

/**
 * 実際の適用マージン率を計算
 * @param modelId モデルID
 * @param costUSD 原価（USD/M tokens）
 * @param exchangeRate 為替レート（円/USD）、デフォルトは PRICING_CONFIG.exchangeRate
 * @returns マージン率（%）
 */
export function getActualMargin(
  modelId: string,
  costUSD: number,
  exchangeRate: number = PRICING_CONFIG.exchangeRate
): number {
  const sellingPrice = getTokenPrice(modelId);
  if (!sellingPrice) return 0;

  const costJPY = costUSD * exchangeRate;
  const margin = ((sellingPrice - costJPY) / costJPY) * 100;
  return Math.round(margin * 10) / 10; // 小数第1位まで
}
