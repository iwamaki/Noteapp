/**
 * Token Purchase Helpers (Simplified)
 *
 * トークン購入（単発購入）機能に関するヘルパー関数とReactフック
 * サブスクリプション機能削除に伴い、購入トークン残高のみで動作するよう簡素化しました。
 */

import { useSettingsStore } from '../../settings/settingsStore';
import { isFlashModel, isProModel } from './modelHelpers';

/**
 * トークン残高を取得するフック
 */
export function useTokenBalance() {
  const getTotalTokensByCategory = useSettingsStore((state) => state.getTotalTokensByCategory);

  return {
    flash: getTotalTokensByCategory('quick'),  // 旧名称との互換性のため
    pro: getTotalTokensByCategory('think'),
  };
}

/**
 * Quick トークン残高を取得（非React環境から呼び出し可能）
 */
export function getFlashTokenBalance(): number {
  const { getTotalTokensByCategory } = useSettingsStore.getState();
  return getTotalTokensByCategory('quick');
}

/**
 * Think トークン残高を取得（非React環境から呼び出し可能）
 */
export function getProTokenBalance(): number {
  const { getTotalTokensByCategory } = useSettingsStore.getState();
  return getTotalTokensByCategory('think');
}

/**
 * Quick トークン残高を取得するフック（シンプル版）
 */
export function useFlashTokenBalance(): number {
  const getTotalTokensByCategory = useSettingsStore((state) => state.getTotalTokensByCategory);
  return getTotalTokensByCategory('quick');
}

/**
 * Think トークン残高を取得するフック（シンプル版）
 */
export function useProTokenBalance(): number {
  const getTotalTokensByCategory = useSettingsStore((state) => state.getTotalTokensByCategory);
  return getTotalTokensByCategory('think');
}

/**
 * 特定のモデルが使用可能かチェック（非React環境から呼び出し可能）
 * 購入トークン残高のみで判定します。
 *
 * @param modelId チェックするモデルID
 * @returns 使用可能かどうか
 */
export function checkModelTokenLimit(modelId: string): {
  canUse: boolean;
  current: number;  // 購入トークン残高
  max: number;      // 上限（互換性のため -1 = 無制限として返す）
  percentage: number; // 使用率（互換性のため 0 を返す）
  tier?: string;    // Tier情報（互換性のため undefined）
  reason?: string;
} {
  const { getTotalTokensByCategory } = useSettingsStore.getState();

  if (isFlashModel(modelId)) {
    const balance = getTotalTokensByCategory('quick');
    return {
      canUse: balance > 0,
      current: balance,
      max: -1,  // 無制限（購入トークンに上限なし）
      percentage: 0,
      reason: balance > 0
        ? undefined
        : 'Quick トークンがありません。トークンを購入してください。',
    };
  } else if (isProModel(modelId)) {
    const balance = getTotalTokensByCategory('think');
    return {
      canUse: balance > 0,
      current: balance,
      max: -1,  // 無制限（購入トークンに上限なし）
      percentage: 0,
      reason: balance > 0
        ? undefined
        : 'Think トークンがありません。トークンを購入してください。',
    };
  }

  // Flash/Pro 以外のモデル（将来の拡張用）
  return {
    canUse: true,
    current: 0,
    max: -1,
    percentage: 0,
  };
}
