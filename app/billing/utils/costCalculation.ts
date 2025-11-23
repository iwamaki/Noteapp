/**
 * @file costCalculation.ts
 * @summary Cost calculation utilities
 * @description 開発モードでのコスト計算とフォーマット機能
 */

import { useUsageTrackingStore } from '../../settings/settingsStore';
import { calculateCost, formatCost, getModelPricing } from '../constants/modelPricing';
import { getTokenPrice } from '../constants/tokenPricing';
import { logger } from '../../utils/logger';

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
  const { usage } = useUsageTrackingStore.getState();

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

/**
 * トークン数からクレジット消費を計算
 * @param modelId モデルID
 * @param inputTokens 入力トークン数
 * @param outputTokens 出力トークン数
 * @returns クレジット消費（P）、モデルが見つからない場合は0
 */
export function calculateCredits(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const sellingPrice = getTokenPrice(modelId);
  if (!sellingPrice) {
    logger.warn('billing', 'Unknown model', { modelId });
    return 0;
  }

  const totalTokens = inputTokens + outputTokens;
  const credits = (totalTokens / 1_000_000) * sellingPrice;

  return credits;
}

/**
 * クレジット額をフォーマットして表示
 * @param credits クレジット額（P）
 * @returns フォーマットされた文字列（例: "120P"）
 */
export function formatCredits(credits: number): string {
  if (credits === 0) return '0P';
  if (credits < 1) return `${credits.toFixed(2)}P`; // 1P未満は小数点2桁表示
  return `${Math.round(credits)}P`;
}

/**
 * 月間クレジット消費情報を計算
 * @returns クレジット消費情報
 */
export function calculateMonthlyCredits(): {
  totalCredits: number;
  creditsByModel: Array<{
    modelId: string;
    displayName: string;
    inputTokens: number;
    outputTokens: number;
    credits: number;
    formattedCredits: string;
  }>;
  formattedTotalCredits: string;
} {
  const { usage } = useUsageTrackingStore.getState();

  let totalCredits = 0;
  const creditsByModel: Array<{
    modelId: string;
    displayName: string;
    inputTokens: number;
    outputTokens: number;
    credits: number;
    formattedCredits: string;
  }> = [];

  // モデル別にクレジット消費を計算
  for (const [modelId, tokenUsage] of Object.entries(usage.monthlyTokensByModel)) {
    const credits = calculateCredits(modelId, tokenUsage.inputTokens, tokenUsage.outputTokens);
    const pricing = getModelPricing(modelId);

    creditsByModel.push({
      modelId,
      displayName: pricing?.displayName || modelId,
      inputTokens: tokenUsage.inputTokens,
      outputTokens: tokenUsage.outputTokens,
      credits,
      formattedCredits: formatCredits(credits),
    });

    totalCredits += credits;
  }

  // クレジット消費が多い順にソート
  creditsByModel.sort((a, b) => b.credits - a.credits);

  return {
    totalCredits,
    creditsByModel,
    formattedTotalCredits: formatCredits(totalCredits),
  };
}

/**
 * 月間クレジット消費情報を取得するReactフック
 */
export function useMonthlyCredits() {
  const creditsInfo = calculateMonthlyCredits();

  return creditsInfo;
}
