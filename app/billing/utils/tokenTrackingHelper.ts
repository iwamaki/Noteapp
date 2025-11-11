/**
 * @file tokenTrackingHelper.ts
 * @summary トークン使用追跡の統合ヘルパー（簡素化版）
 * @description
 * 購入トークン残高の消費と使用量の記録を行うユーティリティ。
 * サブスクリプション機能削除に伴い、シンプルなロジックに変更しました。
 */

import { useSettingsStore } from '../../settings/settingsStore';
import { isFlashModel, isProModel } from './modelHelpers';
import { logger } from '../../utils/logger';

/**
 * トークン使用を記録・消費する統合ヘルパー関数（簡素化版）
 *
 * 以下の処理を一括で実行します：
 * 1. 購入トークン残高から即時消費
 * 2. 月次使用量の記録（統計表示用）
 * 3. LLMリクエスト回数のインクリメント
 *
 * ## 動作の詳細
 *
 * ### 購入トークン残高（永続）
 * - `tokenBalance.flash/pro` から即時消費
 * - 購入時に `addTokens()` で追加
 * - リセットされない（使い切りまで有効）
 *
 * ### 月次使用量（統計用のみ）
 * - `usage.monthlyTokensByModel` に記録
 * - 開発モードでコスト表示に使用
 * - 毎月1日に自動リセット
 *
 * ### 消費ルール
 * - 常に購入トークンから即時消費
 * - 例: Quickトークン残高500k → 100k使用 → 残高400k
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
  const { trackTokenUsage, incrementLLMRequestCount, deductTokens } =
    useSettingsStore.getState();

  try {
    const totalTokens = inputTokens + outputTokens;

    // 1. 購入トークン残高から即時消費（モデル単位で消費）
    await deductTokens(modelId, totalTokens);
    logger.info(
      'system',
      `Deducted ${totalTokens} tokens from ${modelId} balance`
    );

    // 2. 月次使用量を記録（統計表示用）
    await trackTokenUsage(inputTokens, outputTokens, modelId);
    logger.debug(
      'system',
      `Tracked usage for ${modelId}: input=${inputTokens}, output=${outputTokens}`
    );

    // 3. LLMリクエスト回数をインクリメント
    await incrementLLMRequestCount();
  } catch (error) {
    logger.error('system', 'Failed to track and deduct tokens:', error);
    throw error;
  }
}
