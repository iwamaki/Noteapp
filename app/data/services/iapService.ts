/**
 * IAP (In-App Purchase) Service
 *
 * アプリ内課金の処理を管理するサービス
 * - 購入フロー
 * - レシート検証
 * - 購入履歴の復元
 */

import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  getAvailablePurchases,
} from 'react-native-iap';
import type {
  Product,
  Purchase,
  PurchaseError,
} from 'react-native-iap';

import { Platform } from 'react-native';
import { SubscriptionTier } from '../../constants/plans';

/**
 * プロダクトID定義
 * App Store Connect / Play Console で登録するID
 */
export const PRODUCT_IDS = {
  PRO_MONTHLY: Platform.select({
    ios: 'noteapp.pro.monthly',
    android: 'noteapp.pro.monthly',
  }) as string,
  PRO_YEARLY: Platform.select({
    ios: 'noteapp.pro.yearly',
    android: 'noteapp.pro.yearly',
  }) as string,
  ENTERPRISE_MONTHLY: Platform.select({
    ios: 'noteapp.enterprise.monthly',
    android: 'noteapp.enterprise.monthly',
  }) as string,
};

/**
 * IAP初期化状態
 */
let isInitialized = false;
let purchaseUpdateSubscription: any = null;
let purchaseErrorSubscription: any = null;

/**
 * IAP接続の初期化
 * アプリ起動時または購入画面表示時に呼び出す
 */
export async function initializeIAP(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    await initConnection();
    isInitialized = true;
    console.log('[IAP] Connection initialized');
  } catch (error) {
    console.error('[IAP] Failed to initialize connection:', error);
    throw error;
  }
}

/**
 * IAP接続の終了
 * アプリ終了時に呼び出す
 */
export async function disconnectIAP(): Promise<void> {
  try {
    // リスナーを解除
    if (purchaseUpdateSubscription) {
      purchaseUpdateSubscription.remove();
      purchaseUpdateSubscription = null;
    }
    if (purchaseErrorSubscription) {
      purchaseErrorSubscription.remove();
      purchaseErrorSubscription = null;
    }

    await endConnection();
    isInitialized = false;
    console.log('[IAP] Connection ended');
  } catch (error) {
    console.error('[IAP] Failed to end connection:', error);
  }
}

/**
 * 利用可能なサブスクリプション商品を取得
 */
export async function getAvailableSubscriptions(): Promise<Product[]> {
  try {
    const skus = Object.values(PRODUCT_IDS).filter(Boolean) as string[];
    const subscriptions = await fetchProducts({ skus, type: 'subs' });
    console.log('[IAP] Available subscriptions:', subscriptions);
    return (subscriptions as Product[]) || [];
  } catch (error) {
    console.error('[IAP] Failed to get subscriptions:', error);
    return [];
  }
}

/**
 * サブスクリプション購入フロー
 */
export async function purchaseSubscription(
  productId: string,
  onSuccess: (purchase: Purchase) => void,
  onError: (error: PurchaseError) => void,
): Promise<void> {
  // 購入更新リスナーを設定
  purchaseUpdateSubscription = purchaseUpdatedListener((purchase: Purchase) => {
    console.log('[IAP] Purchase updated:', purchase);

    // レシート検証（Phase 1では簡易的、Phase 2でサーバー検証）
    const receipt = purchase.transactionId;
    if (receipt) {
      // トランザクション完了
      finishTransaction({ purchase, isConsumable: false })
        .then(() => {
          console.log('[IAP] Transaction finished');
          onSuccess(purchase);
        })
        .catch((error) => {
          console.error('[IAP] Failed to finish transaction:', error);
        });
    }
  });

  // 購入エラーリスナーを設定
  purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
    console.error('[IAP] Purchase error:', error);
    onError(error);
  });

  try {
    // サブスクリプション購入リクエスト
    await requestPurchase({
      request: {
        ios: { sku: productId },
        android: { sku: productId } as any, // Android の型定義が不完全なので any でキャスト
      },
      type: 'subs',
    } as any); // v14 の型定義が複雑なので any でキャスト
  } catch (error) {
    console.error('[IAP] Failed to request subscription:', error);
    onError(error as PurchaseError);
  }
}

/**
 * 購入履歴の復元
 * アプリ再インストール時や複数デバイス間での同期に使用
 */
export async function restorePurchases(): Promise<Purchase[]> {
  try {
    const purchases = await getAvailablePurchases();
    console.log('[IAP] Restored purchases:', purchases);
    return purchases;
  } catch (error) {
    console.error('[IAP] Failed to restore purchases:', error);
    return [];
  }
}

/**
 * レシートからサブスクリプションTierを判定
 * Phase 1での簡易実装
 */
export function getTierFromProductId(productId: string): SubscriptionTier {
  if (productId.includes('enterprise')) {
    return 'enterprise';
  }
  if (productId.includes('pro')) {
    return 'pro';
  }
  return 'free';
}

/**
 * サブスクリプションの有効期限を取得
 * Phase 1では簡易的に30日後を返す
 * Phase 2でサーバー側のレシート検証から正確な期限を取得
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getSubscriptionExpiry(_purchase: Purchase): Date {
  // 簡易実装: 購入日から30日後
  // TODO Phase 2: purchaseから実際の有効期限を取得
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  return expiryDate;
}

/**
 * サブスクリプションが有効かチェック
 */
export function isSubscriptionActive(expiresAt?: string): boolean {
  if (!expiresAt) {
    return false;
  }
  const now = new Date();
  const expiry = new Date(expiresAt);
  return now < expiry;
}

/**
 * プロダクトIDから価格表示用の文字列を生成
 */
export function formatPrice(product: Product): string {
  // Productの型から価格情報を取得
  const productAny = product as any;
  return productAny.localizedPrice || productAny.price || '¥0';
}

/**
 * プロダクトIDから期間表示用の文字列を生成
 */
export function getPeriodString(productId: string): string {
  if (productId.includes('yearly')) {
    return '年';
  }
  return '月';
}
