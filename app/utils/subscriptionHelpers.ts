/**
 * Subscription Helpers
 *
 * サブスクリプション機能に関するヘルパー関数とReactフック
 */

import { useEffect } from 'react';
import { useSettingsStore } from '../settings/settingsStore';
import {
  SubscriptionTier,
  hasFeatureAccess,
  isWithinLimit,
  getLimit,
  SUBSCRIPTION_PLANS,
  hasModelAccess,
} from '../constants';
import type { FeatureKey } from '../constants/features';
import type { PlanLimits } from '../constants/plans';

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

  return {
    tier: subscription.tier,
    status: subscription.status,
    expiresAt: subscription.expiresAt,
    isActive: subscription.status === 'active' || subscription.status === 'trial',
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
 * 使用量制限をチェック
 */
export function useUsageLimit(limit: keyof PlanLimits): {
  current: number;
  max: number;
  canUse: boolean;
  percentage: number;
} {
  const { tier, isActive, usage } = useSubscription();
  const effectiveTier: SubscriptionTier = isActive ? tier : 'free';

  let current = 0;
  switch (limit) {
    case 'maxMonthlyTokens':
      current = usage.monthlyInputTokens + usage.monthlyOutputTokens;
      break;
    case 'maxFiles':
      current = usage.currentFileCount;
      break;
    case 'maxLLMRequests':
      current = usage.monthlyLLMRequests;
      break;
    case 'maxStorageMB':
      current = usage.storageUsedMB;
      break;
    case 'maxFileSizeMB':
      // 個別ファイルサイズは現在値なし（アップロード時にチェック）
      current = 0;
      break;
  }

  const max = getLimit(effectiveTier, limit);
  const canUse = isWithinLimit(effectiveTier, limit, current);
  const percentage = max === -1 ? 0 : (current / max) * 100;

  return {
    current,
    max,
    canUse,
    percentage,
  };
}

/**
 * LLMリクエストが可能かチェック
 */
export function canSendLLMRequest(): boolean {
  const { tier, isActive, usage } = useSubscription();
  const effectiveTier: SubscriptionTier = isActive ? tier : 'free';

  return isWithinLimit(effectiveTier, 'maxLLMRequests', usage.monthlyLLMRequests);
}

/**
 * トークン上限内かチェック（チャット送信前の判定用）
 * 非React環境（ChatServiceなど）から呼び出し可能
 * @returns トークン上限チェック結果
 */
export function checkTokenLimit(): {
  canSend: boolean;
  currentTokens: number;
  maxTokens: number;
  percentage: number;
  tier: SubscriptionTier;
} {
  // Zustandストアから直接状態を取得（Reactフックを使わない）
  const { settings } = useSettingsStore.getState();
  const { subscription, usage } = settings;

  // サブスクリプションが有効かチェック
  const isActive = subscription.status === 'active' || subscription.status === 'trial';
  const effectiveTier: SubscriptionTier = isActive ? subscription.tier : 'free';

  const currentTokens = usage.monthlyInputTokens + usage.monthlyOutputTokens;
  const maxTokens = getLimit(effectiveTier, 'maxMonthlyTokens');
  const canSend = isWithinLimit(effectiveTier, 'maxMonthlyTokens', currentTokens);
  const percentage = maxTokens === -1 ? 0 : (currentTokens / maxTokens) * 100;

  return {
    canSend,
    currentTokens,
    maxTokens,
    percentage,
    tier: effectiveTier,
  };
}

/**
 * 新規ファイル作成が可能かチェック
 */
export function canCreateFile(): boolean {
  const { tier, isActive, usage } = useSubscription();
  const effectiveTier: SubscriptionTier = isActive ? tier : 'free';

  return isWithinLimit(effectiveTier, 'maxFiles', usage.currentFileCount);
}

/**
 * ファイルサイズが制限内かチェック
 */
export function isFileSizeAllowed(fileSizeMB: number): boolean {
  const { tier, isActive } = useSubscription();
  const effectiveTier: SubscriptionTier = isActive ? tier : 'free';

  const maxSize = getLimit(effectiveTier, 'maxFileSizeMB');
  if (maxSize === -1) return true; // Unlimited

  return fileSizeMB <= maxSize;
}

/**
 * ストレージ容量が制限内かチェック
 */
export function isStorageAvailable(additionalMB: number): boolean {
  const { tier, isActive, usage } = useSubscription();
  const effectiveTier: SubscriptionTier = isActive ? tier : 'free';

  const maxStorage = getLimit(effectiveTier, 'maxStorageMB');
  if (maxStorage === -1) return true; // Unlimited

  return usage.storageUsedMB + additionalMB <= maxStorage;
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

  const allTiers: SubscriptionTier[] = ['free', 'pro', 'enterprise'];
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
