/**
 * 機能フラグと要件定義
 *
 * このファイルでは、アプリの各機能がどのプランで利用可能かを定義します。
 * 機能の追加や変更時は、このファイルを更新してください。
 */

import { SubscriptionTier } from '../billing/constants/plans';

/**
 * 機能キーの型定義
 *
 * 新しい機能を追加する際は、FEATURE_REQUIREMENTSに追加してください。
 * 型は自動的に推論されます。
 */
export type FeatureKey = keyof typeof FEATURE_REQUIREMENTS;

/**
 * 機能要件定義
 *
 * 各機能が必要とする最小プランを定義します。
 * 例: 'pro' を指定すると、pro と enterprise で利用可能になります。
 */
export const FEATURE_REQUIREMENTS = {
  // ===== LLM関連機能 =====
  /** 基本的なチャット機能 */
  'llm.chat': 'free',
  /** 高度なLLMモデル（Gemini Pro等） */
  'llm.advanced_models': 'pro',
  /** カスタムシステムプロンプト */
  'llm.custom_system_prompt': 'pro',
  /** コンテキスト長の拡張 */
  'llm.extended_context': 'pro',
  /** ストリーミングレスポンス */
  'llm.streaming': 'free',

  // ===== 検索関連機能 =====
  /** RAG検索（ナレッジベース検索） */
  'search.rag': 'pro',
  /** Web検索 */
  'search.web': 'pro',
  /** セマンティック検索 */
  'search.semantic': 'pro',
  /** 全文検索 */
  'search.fulltext': 'free',

  // ===== ファイル関連機能 =====
  /** 基本的なファイル編集 */
  'file.basic_edit': 'free',
  /** ファイルの作成・削除 */
  'file.create_delete': 'free',
  /** バッチ操作（複数ファイルの一括処理） */
  'file.batch_operations': 'pro',
  /** バージョン履歴 */
  'file.version_history': 'pro',
  /** ファイルエクスポート */
  'file.export': 'free',
  /** 高度なエクスポート（複数形式） */
  'file.advanced_export': 'pro',

  // ===== 同期・バックアップ機能 =====
  /** クラウド同期 */
  'sync.cloud': 'pro',
  /** 自動バックアップ */
  'backup.automatic': 'pro',
  /** 手動バックアップ */
  'backup.manual': 'free',

  // ===== カテゴリ・タグ機能 =====
  /** 基本的なカテゴリ分類 */
  'category.basic': 'free',
  /** タグ機能 */
  'tag.basic': 'free',
  /** 高度なタグ管理 */
  'tag.advanced': 'pro',

  // ===== UI・UX機能 =====
  /** テーマカスタマイズ */
  'ui.theme_customization': 'free',
  /** 広告なし */
  'ui.ad_free': 'pro',
  /** カスタムフォント */
  'ui.custom_fonts': 'pro',

  // ===== サポート =====
  /** コミュニティサポート */
  'support.community': 'free',
  /** メールサポート */
  'support.email': 'pro',
  /** 優先サポート */
  'support.priority': 'premium',
} as const;

/**
 * LLMモデルの要件定義
 *
 * 各モデルが必要とするプランを定義します。
 *
 * Flash系: Free/Standard プランから利用可能
 * Pro系: Pro/Premium プランから利用可能
 */
export const MODEL_REQUIREMENTS: Record<string, SubscriptionTier> = {
  // Gemini Flash モデル（低コスト: ¥265/M tokens）
  'gemini-2.5-flash': 'free',
  'gemini-1.5-flash': 'free',

  // Gemini Pro モデル（高コスト: ¥1,063/M tokens）
  'gemini-2.5-pro': 'pro',
  'gemini-1.5-pro': 'pro',

  // 将来追加予定のモデル
  // 'gpt-4': 'pro',
  // 'claude-3-opus': 'premium',
};

/**
 * 機能が有効かチェック
 *
 * @param tier ユーザーのサブスクリプションティア
 * @param feature チェックする機能キー
 * @returns 機能が有効な場合 true
 */
export function hasFeatureAccess(
  tier: SubscriptionTier,
  feature: FeatureKey
): boolean {
  const requiredTier = FEATURE_REQUIREMENTS[feature];
  return hasMinimumTier(tier, requiredTier as SubscriptionTier);
}

/**
 * モデルが利用可能かチェック
 *
 * @param tier ユーザーのサブスクリプションティア
 * @param model チェックするモデル名
 * @returns モデルが利用可能な場合 true
 */
export function hasModelAccess(tier: SubscriptionTier, model: string): boolean {
  const requiredTier = MODEL_REQUIREMENTS[model];
  if (!requiredTier) {
    // 定義されていないモデルはデフォルトで無料プランでも利用可能
    return true;
  }
  return hasMinimumTier(tier, requiredTier);
}

/**
 * 最小ティアを満たしているかチェック
 *
 * @param userTier ユーザーのティア
 * @param requiredTier 必要な最小ティア
 * @returns 最小ティアを満たしている場合 true
 */
function hasMinimumTier(
  userTier: SubscriptionTier,
  requiredTier: SubscriptionTier
): boolean {
  const tierOrder: SubscriptionTier[] = ['free', 'standard', 'pro', 'premium'];
  const userIndex = tierOrder.indexOf(userTier);
  const requiredIndex = tierOrder.indexOf(requiredTier);
  return userIndex >= requiredIndex;
}

/**
 * 機能に必要なプラン名を取得
 *
 * @param feature 機能キー
 * @returns 必要なプラン名（日本語表示用）
 */
export function getRequiredPlanName(feature: FeatureKey): string {
  const requiredTier = FEATURE_REQUIREMENTS[feature] as SubscriptionTier;
  const planNames: Record<SubscriptionTier, string> = {
    free: 'フリー',
    standard: 'Standard',
    pro: 'Pro',
    premium: 'Premium',
  };
  return planNames[requiredTier];
}

/**
 * 機能カテゴリを取得
 *
 * @param feature 機能キー
 * @returns カテゴリ名
 */
export function getFeatureCategory(feature: FeatureKey): string {
  const [category] = feature.split('.');
  const categoryNames: Record<string, string> = {
    llm: 'LLM機能',
    search: '検索機能',
    file: 'ファイル管理',
    sync: '同期機能',
    backup: 'バックアップ',
    category: 'カテゴリ管理',
    tag: 'タグ管理',
    ui: 'UI/UX',
    support: 'サポート',
  };
  return categoryNames[category] || 'その他';
}

/**
 * プランで利用可能な機能一覧を取得
 *
 * @param tier サブスクリプションティア
 * @returns 利用可能な機能キーの配列
 */
export function getAvailableFeatures(tier: SubscriptionTier): FeatureKey[] {
  return Object.keys(FEATURE_REQUIREMENTS).filter((feature) =>
    hasFeatureAccess(tier, feature as FeatureKey)
  ) as FeatureKey[];
}

/**
 * 機能のアップグレードが必要かチェック
 *
 * @param tier ユーザーのティア
 * @param feature 機能キー
 * @returns アップグレードが必要な場合、必要なティアを返す。不要な場合はnull
 */
export function getUpgradeRequirement(
  tier: SubscriptionTier,
  feature: FeatureKey
): SubscriptionTier | null {
  if (hasFeatureAccess(tier, feature)) {
    return null;
  }
  return FEATURE_REQUIREMENTS[feature] as SubscriptionTier;
}
