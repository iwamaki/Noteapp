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
import { TOKEN_PACKAGES } from '../../constants/tokenPackages';

/**
 * サブスクリプション プロダクトID定義
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
  PREMIUM_MONTHLY: Platform.select({
    ios: 'noteapp.premium.monthly',
    android: 'noteapp.premium.monthly',
  }) as string,
};

/**
 * トークン購入 プロダクトID定義
 * TOKEN_PACKAGES から自動的に取得
 */
export const TOKEN_PRODUCT_IDS = TOKEN_PACKAGES.map((pkg) => pkg.productId);

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
  product: Product,
  onSuccess: (purchase: Purchase) => void,
  onError: (error: PurchaseError) => void,
): Promise<void> {
  console.log('[IAP] purchaseSubscription called with productId:', productId);
  console.log('[IAP] Product details:', product);

  // 既存のリスナーを解除（重複登録を防ぐ）
  if (purchaseUpdateSubscription) {
    console.log('[IAP] Removing existing purchase update listener');
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    console.log('[IAP] Removing existing purchase error listener');
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }

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
    // ユーザーキャンセルは正常な動作なのでログレベルを分ける
    const errorCode = String(error.code).toLowerCase();
    if (
      errorCode === 'e_user_cancelled' ||
      errorCode === 'user_cancelled' ||
      errorCode === 'user-cancelled'
    ) {
      console.log('[IAP] User cancelled purchase:', error);
    } else {
      console.error('[IAP] Purchase error:', error);
    }
    onError(error);
  });

  try {
    // Androidの場合、offerTokenを取得
    const productAny = product as any;
    const offerToken = productAny.subscriptionOfferDetailsAndroid?.[0]?.offerToken;

    console.log('[IAP] Extracted offerToken:', offerToken);

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

    console.log('[IAP] Requesting purchase with params:', JSON.stringify(requestParams));

    // v14では requestPurchase が統一API
    await requestPurchase(requestParams);
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

/**
 * 利用可能なトークンパッケージ商品を取得
 */
export async function getAvailableTokenPackages(): Promise<Product[]> {
  try {
    const skus = TOKEN_PRODUCT_IDS.filter(Boolean) as string[];

    // トークンパッケージは消費型アイテム（in-app）として取得
    const products = await fetchProducts({ skus, type: 'in-app' });
    console.log('[IAP] Available token packages:', products);
    return (products as Product[]) || [];
  } catch (error) {
    console.error('[IAP] Failed to get token packages:', error);
    return [];
  }
}

/**
 * トークンパッケージ購入フロー
 */
export async function purchaseTokenPackage(
  productId: string,
  product: Product,
  onSuccess: (purchase: Purchase) => void,
  onError: (error: PurchaseError) => void,
): Promise<void> {
  console.log('[IAP] purchaseTokenPackage called with productId:', productId);
  console.log('[IAP] Product details:', product);

  // 既存のリスナーを解除（重複登録を防ぐ）
  if (purchaseUpdateSubscription) {
    console.log('[IAP] Removing existing purchase update listener');
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    console.log('[IAP] Removing existing purchase error listener');
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }

  // 購入更新リスナーを設定
  purchaseUpdateSubscription = purchaseUpdatedListener((purchase: Purchase) => {
    console.log('[IAP] Token package purchase updated:', purchase);

    // レシート検証（Phase 1では簡易的）
    const receipt = purchase.transactionId;
    if (receipt) {
      // トランザクション完了（消費型アイテムなので isConsumable: true）
      finishTransaction({ purchase, isConsumable: true })
        .then(() => {
          console.log('[IAP] Token package transaction finished');
          onSuccess(purchase);
        })
        .catch((error) => {
          console.error('[IAP] Failed to finish token package transaction:', error);
        });
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
      console.log('[IAP] User cancelled token package purchase:', error);
    } else {
      console.error('[IAP] Token package purchase error:', error);
    }
    onError(error);
  });

  try {
    // v14 Modern API: 消費型アイテム購入
    const requestParams: any = {
      request: {
        ios: {
          sku: productId,
        },
        android: {
          skus: [productId],
        },
      },
      type: 'inapp', // 消費型アイテム指定
    };

    console.log('[IAP] Requesting token package purchase with params:', JSON.stringify(requestParams));

    // v14では requestPurchase が統一API
    await requestPurchase(requestParams);
  } catch (error) {
    console.error('[IAP] Failed to request token package purchase:', error);
    onError(error as PurchaseError);
  }
}
