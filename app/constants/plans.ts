/**
 * サブスクリプションプラン定義
 *
 * このファイルでは、アプリの各プランの制限値と利用可能な機能を定義します。
 * フロントエンドとバックエンド両方で同じ値を参照できるようにするため、
 * 一元管理が重要です。
 */

/**
 * プラン制限値の型定義
 */
export interface PlanLimits {
  /** 最大ファイル数（-1 = 無制限） */
  maxFiles: number;
  /** 月間最大LLMリクエスト数（-1 = 無制限） */
  maxLLMRequests: number;
  /** 最大ストレージ容量（MB）（-1 = 無制限） */
  maxStorageMB: number;
  /** 1ファイルあたりの最大サイズ（MB） */
  maxFileSizeMB: number;
}

/**
 * プラン機能フラグの型定義
 */
export interface PlanFeatures {
  /** RAG検索機能 */
  ragSearch: boolean;
  /** Web検索機能 */
  webSearch: boolean;
  /** 高度なLLMモデル（Gemini Proなど） */
  advancedModels: boolean;
  /** クラウド同期 */
  fileSync: boolean;
  /** 優先サポート */
  prioritySupport: boolean;
  /** バッチ操作 */
  batchOperations: boolean;
  /** バージョン履歴 */
  versionHistory: boolean;
  /** カスタムシステムプロンプト */
  customSystemPrompt: boolean;
  /** セマンティック検索 */
  semanticSearch: boolean;
}

/**
 * プラン情報の型定義
 */
export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  displayName: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: 'month' | 'year';
  limits: PlanLimits;
  features: PlanFeatures;
}

/**
 * サブスクリプションティア
 */
export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

/**
 * サブスクリプションプラン定義
 *
 * 価格や制限値を変更する際は、このオブジェクトを更新してください。
 * バックエンドの設定ファイル（server/src/core/config.py）と同期する必要があります。
 */
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'free',
    displayName: 'フリー',
    description: '個人利用に最適な基本プラン',
    price: 0,
    currency: 'JPY',
    billingPeriod: 'month',
    limits: {
      maxFiles: 50,
      maxLLMRequests: 100,
      maxStorageMB: 100,
      maxFileSizeMB: 10,
    },
    features: {
      ragSearch: false,
      webSearch: false,
      advancedModels: false,
      fileSync: false,
      prioritySupport: false,
      batchOperations: false,
      versionHistory: false,
      customSystemPrompt: false,
      semanticSearch: false,
    }
  },

  pro: {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro',
    description: 'プロフェッショナル向けの高機能プラン',
    price: 500,
    currency: 'JPY',
    billingPeriod: 'month',
    limits: {
      maxFiles: 1000,
      maxLLMRequests: 1000,
      maxStorageMB: 5000,
      maxFileSizeMB: 50,
    },
    features: {
      ragSearch: true,
      webSearch: true,
      advancedModels: true,
      fileSync: true,
      prioritySupport: false,
      batchOperations: true,
      versionHistory: true,
      customSystemPrompt: true,
      semanticSearch: true,
    }
  },

  enterprise: {
    id: 'enterprise',
    name: 'enterprise',
    displayName: 'Premium',
    description: 'すべての機能が使える最上位プラン',
    price: 1000,
    currency: 'JPY',
    billingPeriod: 'month',
    limits: {
      maxFiles: -1,
      maxLLMRequests: -1,
      maxStorageMB: -1,
      maxFileSizeMB: 100,
    },
    features: {
      ragSearch: true,
      webSearch: true,
      advancedModels: true,
      fileSync: true,
      prioritySupport: true,
      batchOperations: true,
      versionHistory: true,
      customSystemPrompt: true,
      semanticSearch: true,
    }
  }
} as const;

/**
 * プラン情報を取得
 */
export function getPlanInfo(tier: SubscriptionTier): SubscriptionPlan {
  return SUBSCRIPTION_PLANS[tier];
}

/**
 * 機能が有効かチェック
 */
export function isFeatureEnabled(
  tier: SubscriptionTier,
  feature: keyof PlanFeatures
): boolean {
  return SUBSCRIPTION_PLANS[tier].features[feature];
}

/**
 * 制限値を取得
 */
export function getLimit(
  tier: SubscriptionTier,
  limit: keyof PlanLimits
): number {
  return SUBSCRIPTION_PLANS[tier].limits[limit];
}

/**
 * 制限値をチェック（-1は無制限）
 */
export function isWithinLimit(
  tier: SubscriptionTier,
  limit: keyof PlanLimits,
  currentValue: number
): boolean {
  const maxValue = getLimit(tier, limit);
  if (maxValue === -1) return true;
  return currentValue < maxValue;
}

/**
 * デフォルトプラン（新規ユーザー用）
 */
export const DEFAULT_PLAN: SubscriptionTier = 'free';

/**
 * トライアル期間（日数）
 */
export const TRIAL_PERIOD_DAYS = 14;

/**
 * プランのアップグレード可能性をチェック
 */
export function canUpgradeTo(
  currentTier: SubscriptionTier,
  targetTier: SubscriptionTier
): boolean {
  const tierOrder: SubscriptionTier[] = ['free', 'pro', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const targetIndex = tierOrder.indexOf(targetTier);
  return targetIndex > currentIndex;
}
