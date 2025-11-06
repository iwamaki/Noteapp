/**
 * 定数の再エクスポート
 *
 * このファイルから定数をインポートすることで、
 * 一貫した方法で定数にアクセスできます。
 *
 * @example
 * import { SUBSCRIPTION_PLANS, hasFeatureAccess } from '@/constants';
 */

// プラン定義
export {
  SUBSCRIPTION_PLANS,
  DEFAULT_PLAN,
  TRIAL_PERIOD_DAYS,
  getPlanInfo,
  isFeatureEnabled,
  getLimit,
  isWithinLimit,
  canUpgradeTo,
} from './plans';

export type {
  SubscriptionTier,
  SubscriptionPlan,
  PlanLimits,
  PlanFeatures,
} from './plans';

// 機能要件
export {
  FEATURE_REQUIREMENTS,
  MODEL_REQUIREMENTS,
  hasFeatureAccess,
  hasModelAccess,
  getRequiredPlanName,
  getFeatureCategory,
  getAvailableFeatures,
  getUpgradeRequirement,
} from './features';

export type { FeatureKey } from './features';
