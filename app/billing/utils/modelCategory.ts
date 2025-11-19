/**
 * @file modelCategory.ts
 * @summary Model category utilities
 * @description モデル種別の判定と使用量集計のヘルパー関数
 */

import { getModelCategoryFromId } from '../../features/llmService/utils/modelCategoryHelper';
import { providerCache } from '../../features/llmService/cache/providerCache';

/**
 * モデルIDがQuick系かどうかを判定
 * バックエンドから取得したcategory情報を使用
 * @param modelId チェックするモデルID
 * @returns Quick系の場合 true
 */
export function isQuickModel(modelId: string): boolean {
  const providers = providerCache.getCache();
  return getModelCategoryFromId(modelId, providers) === 'quick';
}

/**
 * モデルIDがThink系かどうかを判定
 * バックエンドから取得したcategory情報を使用
 * @param modelId チェックするモデルID
 * @returns Think系の場合 true
 */
export function isThinkModel(modelId: string): boolean {
  const providers = providerCache.getCache();
  return getModelCategoryFromId(modelId, providers) === 'think';
}


/**
 * Quick/Think別のトークン使用量を取得（非React環境から呼び出し可能）
 *
 * usage.monthlyTokensByModel から各モデルの使用量を集計し、
 * Flash系（Quick）とPro系（Think）に分類して返します。
 *
 * @returns Flash/Pro別の入力・出力・合計トークン数
 */
export function getTokenUsageByModelType(): {
  flash: { inputTokens: number; outputTokens: number; totalTokens: number };
  pro: { inputTokens: number; outputTokens: number; totalTokens: number };
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useUsageTrackingStore } = require('../../settings/settingsStore');
  const { usage } = useUsageTrackingStore.getState();

  let flashInput = 0;
  let flashOutput = 0;
  let proInput = 0;
  let proOutput = 0;

  for (const [modelId, tokenUsage] of Object.entries(usage.monthlyTokensByModel)) {
    const usage = tokenUsage as { inputTokens: number; outputTokens: number };
    if (isQuickModel(modelId)) {
      flashInput += usage.inputTokens;
      flashOutput += usage.outputTokens;
    } else if (isThinkModel(modelId)) {
      proInput += usage.inputTokens;
      proOutput += usage.outputTokens;
    }
  }

  return {
    flash: {
      inputTokens: flashInput,
      outputTokens: flashOutput,
      totalTokens: flashInput + flashOutput,
    },
    pro: {
      inputTokens: proInput,
      outputTokens: proOutput,
      totalTokens: proInput + proOutput,
    },
  };
}
