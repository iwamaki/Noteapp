/**
 * @file tokenTrackingHelper.ts
 * @summary トークン使用追跡の統合ヘルパー
 * @description
 * サブスクリプション月次使用量の記録と購入トークン残高の消費を一括で行うユーティリティ。
 * 重複コードを排除し、トークン管理を一元化します。
 */

import { useSettingsStore } from '../settings/settingsStore';
import { isFlashModel, isProModel, getTokenUsageByModelType } from './subscriptionHelpers';
import { getLimit, type SubscriptionTier } from '../constants';
import { logger } from './logger';

/**
 * トークン使用を記録・消費する統合ヘルパー関数
 *
 * 以下の処理を一括で実行します：
 * 1. 月次使用量の記録（サブスクリプション上限チェック用）
 * 2. LLMリクエスト回数のインクリメント
 * 3. サブスク枠を超えた分だけ購入トークンから消費
 *
 * ## 動作の詳細
 *
 * ### サブスクリプション月次使用量（毎月リセット）
 * - `usage.monthlyTokensByModel` に記録
 * - `checkModelTokenLimit()` で上限チェックに使用
 * - 毎月1日に自動リセット
 *
 * ### 購入トークン残高（永続）
 * - `tokenBalance.flash/pro` から消費
 * - 購入時に `addTokens()` で追加
 * - リセットされない（使い切りまで有効）
 *
 * ### 消費ルール
 * - サブスク月次枠を優先的に消費（購入トークンは減らない）
 * - 月次枠を超えた分**のみ**購入トークンから消費
 * - 例1: Freeプラン（0トークン）+ 購入500k → 100k使用 → 購入残400k
 * - 例2: Proプラン（3M/月）+ 購入500k → 2.9M使用 → サブスク枠内、購入残500k
 * - 例3: Proプラン（3M/月）+ 購入500k → 3.2M使用 → 200k超過、購入残300k
 *
 * @param inputTokens 入力トークン数
 * @param outputTokens 出力トークン数
 * @param modelId モデルID（例: "gemini-2.0-flash-exp", "gemini-1.5-pro"）
 *
 * @example
 * ```typescript
 * // LLMレスポンス受信後
 * await trackAndDeductTokens(
 *   response.tokenUsage.inputTokens,
 *   response.tokenUsage.outputTokens,
 *   response.model
 * );
 * ```
 */
export async function trackAndDeductTokens(
  inputTokens: number,
  outputTokens: number,
  modelId: string
): Promise<void> {
  const { settings, trackTokenUsage, incrementLLMRequestCount, deductTokens } =
    useSettingsStore.getState();

  try {
    const totalTokens = inputTokens + outputTokens;

    // サブスクリプション情報を取得
    const { subscription } = settings;
    const isActive = subscription.status === 'active' || subscription.status === 'trial';
    const effectiveTier: SubscriptionTier = isActive ? subscription.tier : 'free';

    // 使用前の使用量を取得
    const usageBeforeTracking = getTokenUsageByModelType();

    // 1. 月次使用量を記録（サブスクプラン上限チェック用）
    await trackTokenUsage(inputTokens, outputTokens, modelId);
    logger.debug(
      'system',
      `Tracked usage for ${modelId}: input=${inputTokens}, output=${outputTokens}`
    );

    // 2. LLMリクエスト回数をインクリメント
    await incrementLLMRequestCount();

    // 3. サブスク枠を超えた分だけ購入トークンから消費
    // 記録後の使用量を取得
    const usageAfterTracking = getTokenUsageByModelType();

    if (isFlashModel(modelId)) {
      const limit = getLimit(effectiveTier, 'maxMonthlyFlashTokens');
      const usageBefore = usageBeforeTracking.flash.totalTokens;
      const usageAfter = usageAfterTracking.flash.totalTokens;

      // 今回の使用で新たに超過した分を計算
      if (limit !== -1) {
        const excessBefore = Math.max(0, usageBefore - limit);
        const excessAfter = Math.max(0, usageAfter - limit);
        const newExcess = excessAfter - excessBefore;

        if (newExcess > 0) {
          await deductTokens(newExcess, 0);
          logger.info(
            'system',
            `Flash tokens exceeded limit (${usageAfter}/${limit}). Deducted ${newExcess} from purchased balance.`
          );
        } else {
          logger.debug(
            'system',
            `Flash tokens within limit (${usageAfter}/${limit}). No deduction from purchased balance.`
          );
        }
      }
    } else if (isProModel(modelId)) {
      const limit = getLimit(effectiveTier, 'maxMonthlyProTokens');
      const usageBefore = usageBeforeTracking.pro.totalTokens;
      const usageAfter = usageAfterTracking.pro.totalTokens;

      // 今回の使用で新たに超過した分を計算
      if (limit !== -1) {
        const excessBefore = Math.max(0, usageBefore - limit);
        const excessAfter = Math.max(0, usageAfter - limit);
        const newExcess = excessAfter - excessBefore;

        if (newExcess > 0) {
          await deductTokens(0, newExcess);
          logger.info(
            'system',
            `Pro tokens exceeded limit (${usageAfter}/${limit}). Deducted ${newExcess} from purchased balance.`
          );
        } else {
          logger.debug(
            'system',
            `Pro tokens within limit (${usageAfter}/${limit}). No deduction from purchased balance.`
          );
        }
      }
    }
  } catch (error) {
    logger.error('system', 'Failed to track and deduct tokens:', error);
    throw error;
  }
}
