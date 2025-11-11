/**
 * Cost Calculation Helpers
 *
 * 開発モードでのコスト計算とフォーマット機能
 * サブスクリプション機能とは独立して動作します。
 */

import { useSettingsStore } from '../../settings/settingsStore';
import { calculateCost, formatCost, getModelPricing } from '../../constants/pricing';

/**
 * 月間コスト情報を計算
 * @returns コスト情報
 */
export function calculateMonthlyCost(): {
  totalCost: number;
  costByModel: Array<{
    modelId: string;
    displayName: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    formattedCost: string;
  }>;
  formattedTotalCost: string;
} {
  const { settings } = useSettingsStore.getState();
  const { usage } = settings;

  let totalCost = 0;
  const costByModel: Array<{
    modelId: string;
    displayName: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    formattedCost: string;
  }> = [];

  // モデル別にコストを計算
  for (const [modelId, tokenUsage] of Object.entries(usage.monthlyTokensByModel)) {
    const cost = calculateCost(modelId, tokenUsage.inputTokens, tokenUsage.outputTokens);
    const pricing = getModelPricing(modelId);

    costByModel.push({
      modelId,
      displayName: pricing?.displayName || modelId,
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
      cost,
      formattedCost: formatCost(cost),
    });

    totalCost += cost;
  }

  // コストが高い順にソート
  costByModel.sort((a, b) => b.cost - a.cost);

  return {
    totalCost,
    costByModel,
    formattedTotalCost: formatCost(totalCost),
  };
}

/**
 * 月間コスト情報を取得するReactフック
 */
export function useMonthlyCost() {
  const costInfo = calculateMonthlyCost();

  return costInfo;
}
