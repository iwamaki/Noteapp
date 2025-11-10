/**
 * サブスクリプションプラン定義
 *
 * このファイルでは、アプリの各プランの制限値と利用可能な機能を定義します。
 * フロントエンドとバックエンド両方で同じ値を参照できるようにするため、
 * 一元管理が重要です。
 *
 * 📝 収益化戦略: app/docs/monetization-strategy.md 参照
 */

/**
 * プラン制限値の型定義
 *
 * Flash と Pro のトークンを分けて管理します。
 * 価格差が約4倍あるため、別枠での管理が必須です。
 *
 * - Quick (Flash): ¥265/M tokens (混合コスト)
 * - Think (Pro):   ¥1,063/M tokens (混合コスト)
 */
export interface PlanLimits {
  /** Quick モデルの月間最大トークン数（入力+出力の合計）（-1 = 無制限） */
  maxMonthlyFlashTokens: number;
  /** Think モデルの月間最大トークン数（入力+出力の合計）（0 = 使用不可、-1 = 無制限） */
  maxMonthlyProTokens: number;
}

/**
 * プラン機能フラグの型定義
 */
export interface PlanFeatures {
  /** RAG検索機能（Phase 2以降） */
  ragSearch: boolean;
  /** Web検索機能 */
  webSearch: boolean;
  /** 高度なLLMモデル（Gemini Proなど） */
  advancedModels: boolean;
  /** クラウド同期（Phase 2以降） */
  fileSync: boolean;
  /** 優先サポート */
  prioritySupport: boolean;
  /** バッチ操作 */
  batchOperations: boolean;
  /** バージョン履歴 */
  versionHistory: boolean;
  /** カスタムシステムプロンプト */
  customSystemPrompt: boolean;
  /** セマンティック検索（Phase 2以降） */
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
 *
 * Phase 1: free (買い切り必須), standard, pro, premium
 * Phase 2以降: さらに拡張可能
 */
export type SubscriptionTier = 'free' | 'standard' | 'pro' | 'premium';

/**
 * サブスクリプションプラン定義
 *
 * 価格や制限値を変更する際は、このオブジェクトを更新してください。
 * バックエンドの設定ファイル（server/src/core/config.py）と同期する必要があります。
 *
 * 📊 収益化戦略（Phase 2: サブスクリプション導入後）:
 * - Free: 0 tokens（トークン購入必須）
 * - Standard ¥500/月: 1.5M Flash (20% profit)
 * - Pro ¥1,500/月: 3M Flash + 200k Pro (33% profit)
 * - Premium ¥3,000/月: 6M Flash + 400k Pro (33% profit)
 */
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'free',
    displayName: 'フリー',
    description: 'トークン購入で利用可能',
    price: 0,
    currency: 'JPY',
    billingPeriod: 'month',
    limits: {
      maxMonthlyFlashTokens: 0,  // 0 tokens（買い切り¥300でトークン購入が必要）
      maxMonthlyProTokens: 0,    // Pro使用不可
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

  standard: {
    id: 'standard',
    name: 'standard',
    displayName: 'Standard',
    description: '軽めの利用に最適',
    price: 500,
    currency: 'JPY',
    billingPeriod: 'month',
    limits: {
      maxMonthlyFlashTokens: 1000000,  // 1.0M Flash tokens
      maxMonthlyProTokens: 50000,      // 0.05M Pro tokens
    },
    features: {
      ragSearch: false,
      webSearch: true,
      advancedModels: false,
      fileSync: false,
      prioritySupport: false,
      batchOperations: false,
      versionHistory: true,
      customSystemPrompt: false,
      semanticSearch: false,
    }
  },

  pro: {
    id: 'pro',
    name: 'pro',
    displayName: 'Pro',
    description: 'しっかり使いたい方に',
    price: 1500,
    currency: 'JPY',
    billingPeriod: 'month',
    limits: {
      maxMonthlyFlashTokens: 3000000,  // 3.0M Flash tokens
      maxMonthlyProTokens: 300000,     // 0.3M Pro tokens
    },
    features: {
      ragSearch: false,  // Phase 2以降
      webSearch: true,
      advancedModels: true,
      fileSync: false,   // Phase 2以降
      prioritySupport: false,
      batchOperations: true,
      versionHistory: true,
      customSystemPrompt: true,
      semanticSearch: false,  // Phase 2以降
    }
  },

  premium: {
    id: 'premium',
    name: 'premium',
    displayName: 'Premium',
    description: '大量に使う方向け',
    price: 3000,
    currency: 'JPY',
    billingPeriod: 'month',
    limits: {
      maxMonthlyFlashTokens: 5000000,  // 5.0M Flash tokens
      maxMonthlyProTokens: 1000000,    // 1.0M Pro tokens
    },
    features: {
      ragSearch: false,  // Phase 2以降
      webSearch: true,
      advancedModels: true,
      fileSync: false,   // Phase 2以降
      prioritySupport: true,
      batchOperations: true,
      versionHistory: true,
      customSystemPrompt: true,
      semanticSearch: false,  // Phase 2以降
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
 * 制限値をチェック（-1は無制限、0は使用不可）
 */
export function isWithinLimit(
  tier: SubscriptionTier,
  limit: keyof PlanLimits,
  currentValue: number
): boolean {
  const maxValue = getLimit(tier, limit);
  if (maxValue === -1) return true;  // 無制限
  if (maxValue === 0) return false;  // 使用不可
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
  const tierOrder: SubscriptionTier[] = ['free', 'standard', 'pro', 'premium'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const targetIndex = tierOrder.indexOf(targetTier);
  return targetIndex > currentIndex;
}
