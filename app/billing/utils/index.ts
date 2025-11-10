/**
 * @file billing/utils/index.ts
 * @summary Re-export all billing utilities
 *
 * Note: subscriptionHelpers と tokenPurchaseHelpers で重複する関数名があるため、
 * 明示的に分けてエクスポートしています。
 * - subscriptionHelpers: サブスクリプション枠のみをチェック
 * - tokenPurchaseHelpers: サブスクリプション枠 + 購入トークン残高を含めてチェック
 */

// サブスクリプション関連（デフォルトエクスポート）
export * from './subscriptionHelpers';

// トークン購入関連（明示的にエクスポート）
export {
  useTokenBalance,
  getFlashTokenBalance,
  getProTokenBalance,
  useFlashTokenUsage as useFlashTokenUsageWithPurchased,
  useProTokenUsage as useProTokenUsageWithPurchased,
  checkModelTokenLimit as checkModelTokenLimitWithPurchased,
} from './tokenPurchaseHelpers';

// その他のユーティリティ
export * from './tokenTrackingHelper';
export * from './tokenUsageHelpers';
export * from './purchaseHelpers';
