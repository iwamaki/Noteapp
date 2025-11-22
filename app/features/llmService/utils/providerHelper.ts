/**
 * @file providerHelper.ts
 * @summary プロバイダー関連のヘルパー関数
 * @description モデルIDからプロバイダー名を特定するなどのユーティリティ
 */

import type { LLMProvider } from '../types/provider.types';
import { logger } from '../../../utils/logger';

/**
 * モデルIDからプロバイダー名を取得
 * @param modelId モデルID（例: "gpt-5-mini", "gemini-2.5-flash"）
 * @param providers プロバイダー情報のキャッシュ
 * @returns プロバイダー名（見つからない場合は null）
 */
export function getProviderNameFromModelId(
  modelId: string,
  providers: Record<string, LLMProvider> | null
): string | null {
  if (!providers) {
    logger.warn('llm', 'Providers cache is null, cannot determine provider');
    return null;
  }

  // 各プロバイダーの models 配列をチェック
  for (const [providerName, provider] of Object.entries(providers)) {
    if (provider.models.includes(modelId)) {
      return providerName;
    }
  }

  logger.warn('llm', 'Provider not found for model', { modelId });
  return null;
}

/**
 * モデルIDが特定のプロバイダーに属するかチェック
 * @param modelId モデルID
 * @param providerName プロバイダー名
 * @param providers プロバイダー情報のキャッシュ
 * @returns 属する場合は true
 */
export function isModelFromProvider(
  modelId: string,
  providerName: string,
  providers: Record<string, LLMProvider> | null
): boolean {
  if (!providers || !providers[providerName]) {
    return false;
  }

  return providers[providerName].models.includes(modelId);
}
