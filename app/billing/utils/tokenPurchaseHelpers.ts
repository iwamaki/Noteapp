/**
 * Token Purchase Helpers
 *
 * トークン購入（単発購入）機能に関するヘルパー関数とReactフック
 * サブスクリプションとは別に、トークン残高の管理を行います。
 */

import { useSettingsStore } from '../../settings/settingsStore';
import { isFlashModel, isProModel, getTokenUsageByModelType } from './subscriptionHelpers';
import { SubscriptionTier } from '../constants/plans';
import { getLimit, isWithinLimit } from '../constants/plans';

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
 * Flash トークン残高を取得（非React環境から呼び出し可能）
 */
export function getFlashTokenBalance(): number {
  const { settings } = useSettingsStore.getState();
  return settings.tokenBalance.flash;
}

/**
 * Pro トークン残高を取得（非React環境から呼び出し可能）
 */
export function getProTokenBalance(): number {
  const { settings } = useSettingsStore.getState();
  return settings.tokenBalance.pro;
}

/**
 * Flash tokens の使用状況を取得（Reactフック）
 * サブスク枠 + 購入トークン残高を含めた利用可能トークンを返す
 */
export function useFlashTokenUsage(
  tier: SubscriptionTier,
  isActive: boolean,
): {
  current: number;
  max: number;
  available: number; // 利用可能トークン数（サブスク残り + 購入残高）
  canUse: boolean;
  percentage: number;
} {
  const tokenBalance = useSettingsStore((state) => state.settings.tokenBalance);
  const usage = useSettingsStore((state) => state.settings.usage);
  const effectiveTier: SubscriptionTier = isActive ? tier : 'free';

  // Flash使用量を計算（リアクティブに）
  let flashInput = 0;
  let flashOutput = 0;
  for (const [modelId, tokenUsage] of Object.entries(usage.monthlyTokensByModel)) {
    if (isFlashModel(modelId)) {
      flashInput += tokenUsage.inputTokens;
      flashOutput += tokenUsage.outputTokens;
    }
  }
  const current = flashInput + flashOutput;

  const max = getLimit(effectiveTier, 'maxMonthlyFlashTokens');
  const canUse = isWithinLimit(effectiveTier, 'maxMonthlyFlashTokens', current);
  const percentage = max === -1 ? 0 : max > 0 ? (current / max) * 100 : 0;

  // 利用可能トークン = サブスク残り + 購入トークン残高
  let available: number;
  if (max === -1) {
    // 無制限の場合
    available = -1;
  } else {
    const subscriptionRemaining = Math.max(0, max - current);
    available = subscriptionRemaining + tokenBalance.flash;
  }

  return { current, max, available, canUse, percentage };
}

/**
 * Pro tokens の使用状況を取得（Reactフック）
 * サブスク枠 + 購入トークン残高を含めた利用可能トークンを返す
 */
export function useProTokenUsage(
  tier: SubscriptionTier,
  isActive: boolean,
): {
  current: number;
  max: number;
  availableTokens: number; // 利用可能トークン数（サブスク残り + 購入残高）
  available: boolean; // Pro tokens が使えるプランか（後方互換性のため残す）
  canUse: boolean;
  percentage: number;
} {
  const tokenBalance = useSettingsStore((state) => state.settings.tokenBalance);
  const usage = useSettingsStore((state) => state.settings.usage);
  const effectiveTier: SubscriptionTier = isActive ? tier : 'free';

  // Pro使用量を計算（リアクティブに）
  let proInput = 0;
  let proOutput = 0;
  for (const [modelId, tokenUsage] of Object.entries(usage.monthlyTokensByModel)) {
    if (isProModel(modelId)) {
      proInput += tokenUsage.inputTokens;
      proOutput += tokenUsage.outputTokens;
    }
  }
  const current = proInput + proOutput;

  const max = getLimit(effectiveTier, 'maxMonthlyProTokens');
  const available = max > 0 || max === -1; // 0以外なら使用可能
  const canUse = isWithinLimit(effectiveTier, 'maxMonthlyProTokens', current);
  const percentage = max === -1 ? 0 : max > 0 ? (current / max) * 100 : 0;

  // 利用可能トークン = サブスク残り + 購入トークン残高
  let availableTokens: number;
  if (max === -1) {
    // 無制限の場合
    availableTokens = -1;
  } else {
    const subscriptionRemaining = Math.max(0, max - current);
    availableTokens = subscriptionRemaining + tokenBalance.pro;
  }

  return { current, max, canUse, percentage, available, availableTokens };
}

/**
 * 特定のモデルが上限内で使用可能かチェック（非React環境から呼び出し可能）
 * サブスクリプション枠と購入トークン残高の両方を考慮
 * @param modelId チェックするモデルID
 * @returns 使用可能かどうか
 */
export function checkModelTokenLimit(modelId: string): {
  canUse: boolean;
  current: number;
  max: number;
  percentage: number;
  tier: SubscriptionTier;
  reason?: string;
} {
  const { settings } = useSettingsStore.getState();
  const { subscription, tokenBalance } = settings;

  // サブスクリプションが有効かチェック
  const isActiveStatus = subscription.status === 'active' || subscription.status === 'trial' || subscription.status === 'canceled';
  const isWithinExpiry = subscription.expiresAt ? new Date() < new Date(subscription.expiresAt) : true;
  const isActive = isActiveStatus && isWithinExpiry;
  const effectiveTier: SubscriptionTier = isActive ? subscription.tier : 'free';

  const tokenUsage = getTokenUsageByModelType();

  if (isFlashModel(modelId)) {
    const current = tokenUsage.flash.totalTokens;
    const max = getLimit(effectiveTier, 'maxMonthlyFlashTokens');
    const withinSubscriptionLimit = isWithinLimit(effectiveTier, 'maxMonthlyFlashTokens', current);
    const percentage = max === -1 ? 0 : max > 0 ? (current / max) * 100 : 0;

    // サブスクリプションの月次枠内 OR 購入トークン残高がある場合は使用可能
    const hasPurchasedTokens = tokenBalance.flash > 0;
    const canUse = withinSubscriptionLimit || hasPurchasedTokens;

    return {
      canUse,
      current,
      max,
      percentage,
      tier: effectiveTier,
      reason: canUse
        ? undefined
        : 'Flash トークンがありません。トークンを購入してください。',
    };
  } else if (isProModel(modelId)) {
    const current = tokenUsage.pro.totalTokens;
    const max = getLimit(effectiveTier, 'maxMonthlyProTokens');
    const withinSubscriptionLimit = isWithinLimit(effectiveTier, 'maxMonthlyProTokens', current);
    const percentage = max === -1 ? 0 : max > 0 ? (current / max) * 100 : 0;

    // サブスクリプションの月次枠内 OR 購入トークン残高がある場合は使用可能
    const hasPurchasedTokens = tokenBalance.pro > 0;
    const canUse = withinSubscriptionLimit || hasPurchasedTokens;

    return {
      canUse,
      current,
      max,
      percentage,
      tier: effectiveTier,
      reason: canUse
        ? undefined
        : 'Pro トークンがありません。トークンを購入してください。',
    };
  }

  // Flash/Pro 以外のモデル（将来の拡張用）
  return {
    canUse: true,
    current: 0,
    max: -1,
    percentage: 0,
    tier: effectiveTier,
  };
}
