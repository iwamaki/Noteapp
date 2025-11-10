/**
 * Subscription Helpers
 *
 * サブスクリプション機能に関するヘルパー関数とReactフック
 */

import { useEffect } from 'react';
import { useSettingsStore } from '../../settings/settingsStore';
import {
  SubscriptionTier,
  hasFeatureAccess,
  isWithinLimit,
  getLimit,
  SUBSCRIPTION_PLANS,
  hasModelAccess,
} from '../../constants';
import type { FeatureKey } from '../../constants/features';
import type { PlanLimits } from '../constants/plans';
import { calculateCost, formatCost, getModelPricing } from '../../constants/pricing';

/**
 * 現在のサブスクリプション情報を取得するフック
 * 期限切れの場合、自動的にFreeプランにダウングレード
 */
export function useSubscription() {
  const { settings, updateSettings } = useSettingsStore();
  const { subscription, usage } = settings;

  // 期限チェックと自動ダウングレード
  useEffect(() => {
    // 期限が設定されている場合のみチェック
    if (!subscription.expiresAt) {
      return;
    }

    // 既にexpiredの場合はスキップ
    if (subscription.status === 'expired') {
      return;
    }

    // 期限切れかチェック
    const now = new Date();
    const expiry = new Date(subscription.expiresAt);
    const isExpired = now >= expiry;

    if (isExpired) {
      console.log('[Subscription] Subscription expired, downgrading to free plan');
      // 自動的にFreeプランにダウングレード
      updateSettings({
        subscription: {
          tier: 'free',
          status: 'expired',
          expiresAt: subscription.expiresAt, // 期限は保持（履歴として）
          trialStartedAt: undefined,
          autoRenew: false,
        },
      });
    }
  }, [subscription.expiresAt, subscription.status, updateSettings]);

  // サブスクが有効かどうかの判定を修正
  // active, trial, canceled の場合でも、期限内であることが必要
  const isActiveStatus = subscription.status === 'active' || subscription.status === 'trial' || subscription.status === 'canceled';
  const isWithinExpiry = subscription.expiresAt ? new Date() < new Date(subscription.expiresAt) : true; // 期限未設定の場合は有効とみなす
  const isActive = isActiveStatus && isWithinExpiry;

  return {
    tier: subscription.tier,
    status: subscription.status,
    expiresAt: subscription.expiresAt,
    isActive,
    isTrial: subscription.status === 'trial',
    isExpired: subscription.status === 'expired',
    autoRenew: subscription.autoRenew,
    usage,
  };
}

/**
 * 特定の機能が利用可能かチェック
 */
export function useFeatureAccess(feature: FeatureKey): boolean {
  const { tier, isActive } = useSubscription();

  // サブスクリプションが無効の場合、freeプランとして扱う
  const effectiveTier: SubscriptionTier = isActive ? tier : 'free';

  return hasFeatureAccess(effectiveTier, feature);
}

/**
 * 特定のLLMモデルが利用可能かチェック
 */
export function useModelAccess(modelId: string): boolean {
  const { tier, isActive } = useSubscription();

  // サブスクリプションが無効の場合、freeプランとして扱う
  const effectiveTier: SubscriptionTier = isActive ? tier : 'free';

  return hasModelAccess(effectiveTier, modelId);
}

/**
 * 使用量制限をチェック（Flash/Pro 別に移行済み）
 * @deprecated useFlashTokenUsage() と useProTokenUsage() を使用してください
 */
export function useUsageLimit(limit: keyof PlanLimits): {
  current: number;
  max: number;
  canUse: boolean;
  percentage: number;
} {
  const { tier, isActive } = useSubscription();
  const effectiveTier: SubscriptionTier = isActive ? tier : 'free';

  let current = 0;
  let max = 0;

  switch (limit) {
    case 'maxMonthlyFlashTokens': {
      const flashUsage = getTokenUsageByModelType();
      current = flashUsage.flash.totalTokens;
      max = getLimit(effectiveTier, 'maxMonthlyFlashTokens');
      break;
    }
    case 'maxMonthlyProTokens': {
      const proUsage = getTokenUsageByModelType();
      current = proUsage.pro.totalTokens;
      max = getLimit(effectiveTier, 'maxMonthlyProTokens');
      break;
    }
    default:
      // 古いフィールドは使用不可
      console.warn(`[useUsageLimit] Deprecated limit field: ${limit}`);
      return { current: 0, max: 0, canUse: false, percentage: 0 };
  }

  const canUse = isWithinLimit(effectiveTier, limit, current);
  const percentage = max === -1 ? 0 : max > 0 ? (current / max) * 100 : 0;

  return {
    current,
    max,
    canUse,
    percentage,
  };
}

/**
 * LLMリクエストが可能かチェック
 * @deprecated Phase 1では使用しません。トークン上限で自然に制限されます。
 */
export function canSendLLMRequest(): boolean {
  // Phase 1では LLMリクエスト数の制限は廃止（トークンで自然に制限される）
  return true;
}

/**
 * トークン上限内かチェック（チャット送信前の判定用）
 * @deprecated checkModelTokenLimit() を使用してください（Flash/Pro別）
 */
/**
 * 新規ファイル作成が可能かチェック
 * @deprecated Phase 1ではファイル数制限は廃止されました
 */
export function canCreateFile(): boolean {
  // Phase 1ではファイル数制限なし
  return true;
}

/**
 * ファイルサイズが制限内かチェック
 * @deprecated Phase 1ではファイルサイズ制限は廃止されました
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isFileSizeAllowed(_fileSizeMB: number): boolean {
  // Phase 1ではファイルサイズ制限なし
  return true;
}

/**
 * ストレージ容量が制限内かチェック
 * @deprecated Phase 1ではストレージ制限は廃止されました（Phase 2以降）
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function isStorageAvailable(_additionalMB: number): boolean {
  // Phase 1ではストレージ制限なし（クラウド同期未実装）
  return true;
}

/**
 * プラン情報を取得
 */
export function usePlanInfo(targetTier?: SubscriptionTier) {
  const { tier } = useSubscription();
  const planTier = targetTier || tier;

  return SUBSCRIPTION_PLANS[planTier];
}

/**
 * アップグレード可能なプランを取得
 */
export function useAvailableUpgrades(): SubscriptionTier[] {
  const { tier } = useSubscription();

  const allTiers: SubscriptionTier[] = ['free', 'standard', 'pro', 'premium'];
  const currentIndex = allTiers.indexOf(tier);

  return allTiers.slice(currentIndex + 1);
}

/**
 * サブスクリプション状態のテキスト表示
 */
export function getSubscriptionStatusText(
  status: 'active' | 'canceled' | 'expired' | 'trial' | 'none',
): string {
  switch (status) {
    case 'active':
      return '有効';
    case 'trial':
      return 'トライアル中';
    case 'canceled':
      return 'キャンセル済み（期限まで利用可能）';
    case 'expired':
      return '期限切れ';
    case 'none':
      return '未登録';
  }
}

/**
 * 使用量の警告レベルを取得
 * @returns 'safe' | 'warning' | 'danger'
 */
export function getUsageWarningLevel(percentage: number): 'safe' | 'warning' | 'danger' {
  if (percentage >= 90) return 'danger';
  if (percentage >= 70) return 'warning';
  return 'safe';
}

/**
 * 使用量の色を取得
 */
export function getUsageColor(percentage: number): string {
  const level = getUsageWarningLevel(percentage);
  switch (level) {
    case 'danger':
      return '#EF4444'; // red-500
    case 'warning':
      return '#F59E0B'; // amber-500
    case 'safe':
      return '#10B981'; // green-500
  }
}

/**
 * 期限までの日数を計算
 */
export function getDaysUntilExpiry(expiresAt?: string): number | null {
  if (!expiresAt) return null;

  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * 期限表示テキストを生成
 */
export function getExpiryText(expiresAt?: string): string {
  const days = getDaysUntilExpiry(expiresAt);

  if (days === null) return '期限なし';
  if (days < 0) return '期限切れ';
  if (days === 0) return '今日まで';
  if (days === 1) return '明日まで';
  if (days <= 7) return `残り${days}日`;
  if (days <= 30) return `残り約${Math.ceil(days / 7)}週間`;

  return `残り約${Math.ceil(days / 30)}ヶ月`;
}

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

/**
 * モデルIDがFlash系かProかを判定
 */
export function isFlashModel(modelId: string): boolean {
  return modelId.toLowerCase().includes('flash');
}

export function isProModel(modelId: string): boolean {
  return modelId.toLowerCase().includes('pro');
}

/**
 * Flash/Pro別のトークン使用量を取得（非React環境から呼び出し可能）
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

/**
 * Flash tokens の使用状況を取得（Reactフック）
 * サブスク枠 + 購入トークン残高を含めた利用可能トークンを返す
 */
export function useFlashTokenUsage(): {
  current: number;
  max: number;
  available: number; // 利用可能トークン数（サブスク残り + 購入残高）
  canUse: boolean;
  percentage: number;
} {
  const { tier, isActive } = useSubscription();
  const tokenBalance = useSettingsStore((state) => state.settings.tokenBalance); // リアクティブに取得
  const usage = useSettingsStore((state) => state.settings.usage); // リアクティブに取得
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
export function useProTokenUsage(): {
  current: number;
  max: number;
  availableTokens: number; // 利用可能トークン数（サブスク残り + 購入残高）
  available: boolean; // Pro tokens が使えるプランか（後方互換性のため残す）
  canUse: boolean;
  percentage: number;
} {
  const { tier, isActive } = useSubscription();
  const tokenBalance = useSettingsStore((state) => state.settings.tokenBalance); // リアクティブに取得
  const usage = useSettingsStore((state) => state.settings.usage); // リアクティブに取得
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
  // active, trial, canceled の場合でも、期限内であることが必要
  const isActiveStatus = subscription.status === 'active' || subscription.status === 'trial' || subscription.status === 'canceled';
  const isWithinExpiry = subscription.expiresAt ? new Date() < new Date(subscription.expiresAt) : true; // 期限未設定の場合は有効とみなす
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
        : max === 0 && !hasPurchasedTokens
        ? 'Flash tokens が 0 です。トークンを購入してください。'
        : !withinSubscriptionLimit && !hasPurchasedTokens
        ? 'Flash tokens の上限に達しました。トークンを購入するか、プランをアップグレードしてください。'
        : 'Flash tokens が不足しています。',
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
        : max === 0 && !hasPurchasedTokens
        ? 'Pro モデルは Pro プラン以上で利用可能です。'
        : !withinSubscriptionLimit && !hasPurchasedTokens
        ? 'Pro tokens の上限に達しました。トークンを購入するか、プランをアップグレードしてください。'
        : 'Pro tokens が不足しています。',
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
