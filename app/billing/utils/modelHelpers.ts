/**
 * Model Helpers
 *
 * モデル種別の判定と使用量集計のヘルパー関数
 * サブスクリプション機能と単発購入機能の両方で共通利用
 */

import { useSettingsStore } from '../../settings/settingsStore';

/**
 * モデルIDがFlash系（Quick）かどうかを判定
 * @param modelId チェックするモデルID
 * @returns Flash系の場合 true
 */
export function isFlashModel(modelId: string): boolean {
  return modelId.toLowerCase().includes('flash');
}

/**
 * モデルIDがPro系（Think）かどうかを判定
 * @param modelId チェックするモデルID
 * @returns Pro系の場合 true
 */
export function isProModel(modelId: string): boolean {
  return modelId.toLowerCase().includes('pro');
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
    if (isFlashModel(modelId)) {
      flashInput += tokenUsage.inputTokens;
      flashOutput += tokenUsage.outputTokens;
    } else if (isProModel(modelId)) {
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
