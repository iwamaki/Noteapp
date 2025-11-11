/**
 * @file pricing.ts
 * @summary LLMモデルの料金テーブル
 * @description
 * 各LLMモデルの入力・出力トークン単価を定義。
 * コスト計算に使用。
 */

/**
 * トークンあたりの料金（USD）
 * 1Mトークンあたりの価格で定義
 */
export interface ModelPricing {
  /** モデルID */
  modelId: string;
  /** モデル表示名 */
  displayName: string;
  /** 入力トークン単価（USD per 1M tokens） */
  inputPricePer1M: number;
  /** 出力トークン単価（USD per 1M tokens） */
  outputPricePer1M: number;
  /** 無料期間中かどうか */
  isFree?: boolean;
}

/**
 * Geminiモデルの料金テーブル
 * 参照: https://ai.google.dev/pricing
 * 最終更新: 2025-01
 */
export const GEMINI_PRICING: Record<string, ModelPricing> = {
  // Gemini 2.5 Pro (for prompts <= 200k tokens)
  'gemini-2.5-pro': {
    modelId: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    inputPricePer1M: 1.25,
    outputPricePer1M: 10.0,
  },

  // Gemini 2.5 Flash
  'gemini-2.5-flash': {
    modelId: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    inputPricePer1M: 0.3,
    outputPricePer1M: 2.5,
  },

  // Gemini 2.0 Flash
  'gemini-2.0-flash': {
    modelId: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    inputPricePer1M: 0.10,
    outputPricePer1M: 0.40,
  },
  // Note: Gemini 1.5 series and 2.0 Pro have been discontinued.
};

/**
 * 全モデルの料金テーブル
 */
export const MODEL_PRICING: Record<string, ModelPricing> = {
  ...GEMINI_PRICING,
};

/**
 * モデルIDから料金情報を取得
 * @param modelId モデルID
 * @returns 料金情報、存在しない場合はundefined
 */
export function getModelPricing(modelId: string): ModelPricing | undefined {
  // 🆕 バックエンドから取得した価格を優先
  try {
    const APIService = require('../features/chat/llmService/api').default;
    const providers = APIService.getCachedLLMProviders();

    if (providers) {
      const geminiProvider = providers.gemini;
      const metadata = geminiProvider?.modelMetadata?.[modelId];

      if (metadata?.pricing) {
        return {
          modelId,
          displayName: metadata.displayName || modelId,
          inputPricePer1M: metadata.pricing.cost.inputPricePer1M,
          outputPricePer1M: metadata.pricing.cost.outputPricePer1M,
        };
      }
    }
  } catch (error) {
    console.warn('[Pricing] Failed to get pricing from backend, using fallback', error);
  }

  // フォールバック: ローカルの価格テーブル
  return MODEL_PRICING[modelId];
}

/**
 * トークン数からコストを計算（USD）
 * @param modelId モデルID
 * @param inputTokens 入力トークン数
 * @param outputTokens 出力トークン数
 * @returns コスト（USD）、モデルが見つからない場合は0
 */
export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPricing(modelId);
  if (!pricing) {
    console.warn(`[Pricing] Unknown model: ${modelId}`);
    return 0;
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPricePer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPricePer1M;

  return inputCost + outputCost;
}

/**
 * コストをフォーマットして表示（USD）
 * @param cost コスト（USD）
 * @returns フォーマットされた文字列（例: "$0.0012"）
 */
export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(4)}`; // 少額の場合は4桁表示
  return `$${cost.toFixed(2)}`;
}
