/**
 * Subscription IAP Service
 *
 * サブスクリプション購入専用のIAPサービス
 * - サブスクリプション購入フロー
 * - サブスクリプションレシート検証
 * - サブスクリプション購入履歴の復元
 */

import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
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
import { SubscriptionTier } from '../constants/plans';

/**
 * サブスクリプション プロダクトID定義
 * App Store Connect / Play Console で登録するID
 */
export const SUBSCRIPTION_PRODUCT_IDS = {
  STANDARD_MONTHLY: Platform.select({
    ios: 'noteapp.standard.monthly',
    android: 'noteapp.standard.monthly',
  }) as string,
  PRO_MONTHLY: Platform.select({
    ios: 'noteapp.pro.monthly',
    android: 'noteapp.pro.monthly',
  }) as string,
  PRO_YEARLY: Platform.select({
    ios: 'noteapp.pro.yearly',
    android: 'noteapp.pro.yearly',
  }) as string,
  PREMIUM_MONTHLY: Platform.select({
    ios: 'noteapp.premium.monthly',
    android: 'noteapp.premium.monthly',
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
export async function initializeSubscriptionIAP(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    await initConnection();
    isInitialized = true;
    console.log('[Subscription IAP] Connection initialized');
  } catch (error) {
    console.error('[Subscription IAP] Failed to initialize connection:', error);
    throw error;
  }
}

/**
 * IAP接続の終了
 * アプリ終了時に呼び出す
 */
export async function disconnectSubscriptionIAP(): Promise<void> {
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
    console.log('[Subscription IAP] Connection ended');
  } catch (error) {
    console.error('[Subscription IAP] Failed to end connection:', error);
  }
}

/**
 * 利用可能なサブスクリプション商品を取得
 */
export async function getAvailableSubscriptions(): Promise<Product[]> {
  try {
    const skus = Object.values(SUBSCRIPTION_PRODUCT_IDS).filter(Boolean) as string[];
    const subscriptions = await fetchProducts({ skus, type: 'subs' });
    console.log('[Subscription IAP] Available subscriptions:', subscriptions);
    return (subscriptions as Product[]) || [];
  } catch (error) {
    console.error('[Subscription IAP] Failed to get subscriptions:', error);
    return [];
  }
}

/**
 * サブスクリプション購入フロー
 */
export async function purchaseSubscription(
  productId: string,
  product: Product,
  onSuccess: (purchase: Purchase) => void,
  onError: (error: PurchaseError) => void,
): Promise<void> {
  console.log('[Subscription IAP] purchaseSubscription called with productId:', productId);
  console.log('[Subscription IAP] Product details:', product);

  // 既存のリスナーを解除（重複登録を防ぐ）
  if (purchaseUpdateSubscription) {
    console.log('[Subscription IAP] Removing existing purchase update listener');
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    console.log('[Subscription IAP] Removing existing purchase error listener');
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }

  // 購入更新リスナーを設定
  purchaseUpdateSubscription = purchaseUpdatedListener((purchase: Purchase) => {
    console.log('[Subscription IAP] Purchase updated:', purchase);

    // レシート検証（Phase 2ではonSuccess側で検証後にfinishTransactionを呼ぶ）
    const receipt = purchase.transactionId;
    if (receipt) {
      // Phase 2: onSuccessでバックエンド検証後にfinishTransactionを呼ぶため、ここでは呼ばない
      onSuccess(purchase);
    }
  });

  // 購入エラーリスナーを設定
  purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
    // ユーザーキャンセルは正常な動作なのでログレベルを分ける
    const errorCode = String(error.code).toLowerCase();
    if (
      errorCode === 'e_user_cancelled' ||
      errorCode === 'user_cancelled' ||
      errorCode === 'user-cancelled'
    ) {
      console.log('[Subscription IAP] User cancelled purchase:', error);
    } else {
      console.error('[Subscription IAP] Purchase error:', error);
    }
    onError(error);
  });

  try {
    // Androidの場合、offerTokenを取得
    const productAny = product as any;
    const offerToken = productAny.subscriptionOfferDetailsAndroid?.[0]?.offerToken;

    console.log('[Subscription IAP] Extracted offerToken:', offerToken);

    // v14 Modern API: request キーの中に platform-specific な設定を入れる
    const requestParams: any = {
      request: {
        ios: {
          sku: productId,
        },
        android: {
          skus: [productId],
        },
      },
      type: 'subs', // サブスクリプション指定
    };

    // Androidの場合、subscriptionOffersを追加
    if (Platform.OS === 'android' && offerToken) {
      requestParams.request.android.subscriptionOffers = [{
        sku: productId,
        offerToken: offerToken,
      }];
    }

    console.log('[Subscription IAP] Requesting purchase with params:', JSON.stringify(requestParams));

    // v14では requestPurchase が統一API
    await requestPurchase(requestParams);
  } catch (error) {
    console.error('[Subscription IAP] Failed to request subscription:', error);
    onError(error as PurchaseError);
  }
}

/**
 * サブスクリプション購入履歴の復元
 * アプリ再インストール時や複数デバイス間での同期に使用
 */
export async function restoreSubscriptions(): Promise<Purchase[]> {
  try {
    const purchases = await getAvailablePurchases();
    console.log('[Subscription IAP] Restored purchases:', purchases);

    // サブスクリプションのみをフィルタリング
    const subscriptionPurchases = purchases.filter((purchase) => {
      const productId = purchase.productId;
      return Object.values(SUBSCRIPTION_PRODUCT_IDS).includes(productId);
    });

    return subscriptionPurchases;
  } catch (error) {
    console.error('[Subscription IAP] Failed to restore purchases:', error);
    return [];
  }
}

/**
 * レシートからサブスクリプションTierを判定
 * Phase 1での簡易実装
 */
export function getTierFromProductId(productId: string): SubscriptionTier {
  if (productId.includes('premium')) {
    return 'premium';
  }
  if (productId.includes('pro')) {
    return 'pro';
  }
  if (productId.includes('standard')) {
    return 'standard';
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
export function formatSubscriptionPrice(product: Product): string {
  // Productの型から価格情報を取得
  const productAny = product as any;
  return productAny.localizedPrice || productAny.price || '¥0';
}

/**
 * プロダクトIDから期間表示用の文字列を生成
 */
export function getSubscriptionPeriodString(productId: string): string {
  if (productId.includes('yearly')) {
    return '年';
  }
  return '月';
}
