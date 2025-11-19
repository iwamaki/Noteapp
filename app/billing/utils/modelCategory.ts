/**
 * @file modelCategory.ts
 * @summary Model category utilities
 * @description モデル種別の判定と使用量集計のヘルパー関数
 */

import { useSettingsStore } from '../../settings/settingsStore';
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
 * settings.usage.monthlyTokensByModel から各モデルの使用量を集計し、
 * Flash系（Quick）とPro系（Think）に分類して返します。
 *
 * @returns Flash/Pro別の入力・出力・合計トークン数
 */
export function getTokenUsageByModelType(): {
  flash: { inputTokens: number; outputTokens: number; totalTokens: number };
  pro: { inputTokens: number; outputTokens: number; totalTokens: number };
} {
  const { settings } = useSettingsStore.getState();
  const { usage } = settings;

  let flashInput = 0;
  let flashOutput = 0;
  let proInput = 0;
  let proOutput = 0;

  for (const [modelId, tokenUsage] of Object.entries(usage.monthlyTokensByModel)) {
    if (isQuickModel(modelId)) {
      flashInput += tokenUsage.inputTokens;
      flashOutput += tokenUsage.outputTokens;
    } else if (isThinkModel(modelId)) {
      proInput += tokenUsage.inputTokens;
      proOutput += tokenUsage.outputTokens;
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
