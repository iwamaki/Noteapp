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
  const tokenBalance = useSettingsStore((state) => state.settings.tokenBalance);

  return {
    flash: tokenBalance.flash,
    pro: tokenBalance.pro,
  };
}

/**
 * Quick トークン残高を取得（非React環境から呼び出し可能）
 */
export function getFlashTokenBalance(): number {
  const { settings } = useSettingsStore.getState();
  return settings.tokenBalance.flash;
}

/**
 * Think トークン残高を取得（非React環境から呼び出し可能）
 */
export function getProTokenBalance(): number {
  const { settings } = useSettingsStore.getState();
  return settings.tokenBalance.pro;
}

/**
 * Quick トークン残高を取得するフック（シンプル版）
 */
export function useFlashTokenBalance(): number {
  return useSettingsStore((state) => state.settings.tokenBalance.flash);
}

/**
 * Think トークン残高を取得するフック（シンプル版）
 */
export function useProTokenBalance(): number {
  return useSettingsStore((state) => state.settings.tokenBalance.pro);
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
  const { settings } = useSettingsStore.getState();
  const { tokenBalance } = settings;

  if (isFlashModel(modelId)) {
    const balance = tokenBalance.flash;
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
    const balance = tokenBalance.pro;
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
