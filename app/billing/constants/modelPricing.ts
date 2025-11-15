/**
 * @file modelPricing.ts
 * @summary LLMモデルの料金情報取得（バックエンド経由）
 * @description
 * 各LLMモデルの入力・出力トークン単価をバックエンドから取得。
 * 開発モードでのコスト計算に使用。
 * すべての価格情報はバックエンドが唯一の情報源（Single Source of Truth）。
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
 * モデルIDから料金情報を取得（バックエンドキャッシュ経由）
 * @param modelId モデルID
 * @returns 料金情報、存在しない場合はundefined
 */
export function getModelPricing(modelId: string): ModelPricing | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const APIService = require('../../features/chat/llmService/api').default;
    const providers = APIService.getCachedLLMProviders();

    if (providers) {
      // すべてのプロバイダーから価格情報を検索
      for (const provider of Object.values(providers)) {
        const typedProvider = provider as any;
        const metadata = typedProvider?.modelMetadata?.[modelId];

        if (metadata?.pricing) {
          return {
            modelId,
            displayName: metadata.displayName || modelId,
            inputPricePer1M: metadata.pricing.cost.inputPricePer1M,
            outputPricePer1M: metadata.pricing.cost.outputPricePer1M,
          };
        }
      }
    }
  } catch (error) {
    console.error('[Pricing] Failed to get pricing from backend cache', error);
  }

  // 価格情報が見つからない場合はundefinedを返す
  console.warn(`[Pricing] No pricing information found for model: ${modelId}`);
  return undefined;
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
