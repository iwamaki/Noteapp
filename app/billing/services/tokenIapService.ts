/**
 * Token Purchase IAP Service
 *
 * トークンパッケージ購入専用のIAPサービス
 * - トークンパッケージ購入フロー
 * - トークン購入レシート検証
 * - トークン購入履歴の復元
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
import { TOKEN_PACKAGES } from '../constants/tokenPackages';

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
export async function initializeTokenIAP(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    await initConnection();
    isInitialized = true;
    console.log('[Token IAP] Connection initialized');
  } catch (error) {
    console.error('[Token IAP] Failed to initialize connection:', error);
    throw error;
  }
}

/**
 * IAP接続の終了
 * アプリ終了時に呼び出す
 */
export async function disconnectTokenIAP(): Promise<void> {
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
    console.log('[Token IAP] Connection ended');
  } catch (error) {
    console.error('[Token IAP] Failed to end connection:', error);
  }
}

/**
 * 利用可能なトークンパッケージ商品を取得
 */
export async function getAvailableTokenPackages(): Promise<Product[]> {
  try {
    const skus = TOKEN_PRODUCT_IDS.filter(Boolean) as string[];

    // トークンパッケージは消費型アイテム（in-app）として取得
    const products = await fetchProducts({ skus, type: 'in-app' });
    console.log('[Token IAP] Available token packages:', products);
    return (products as Product[]) || [];
  } catch (error) {
    console.error('[Token IAP] Failed to get token packages:', error);
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
  console.log('[Token IAP] purchaseTokenPackage called with productId:', productId);
  console.log('[Token IAP] Product details:', product);

  // 既存のリスナーを解除（重複登録を防ぐ）
  if (purchaseUpdateSubscription) {
    console.log('[Token IAP] Removing existing purchase update listener');
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    console.log('[Token IAP] Removing existing purchase error listener');
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }

  // 購入更新リスナーを設定
  purchaseUpdateSubscription = purchaseUpdatedListener((purchase: Purchase) => {
    console.log('[Token IAP] Token package purchase updated:', purchase);

    // レシート検証（Phase 1では簡易的）
    const receipt = purchase.transactionId;
    if (receipt) {
      // トランザクション完了（消費型アイテムなので isConsumable: true）
      finishTransaction({ purchase, isConsumable: true })
        .then(() => {
          console.log('[Token IAP] Token package transaction finished');
          onSuccess(purchase);
        })
        .catch((error) => {
          console.error('[Token IAP] Failed to finish token package transaction:', error);
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
      console.log('[Token IAP] User cancelled token package purchase:', error);
    } else {
      console.error('[Token IAP] Token package purchase error:', error);
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
      type: 'in-app', // 消費型アイテム指定
    };

    console.log('[Token IAP] Requesting token package purchase with params:', JSON.stringify(requestParams));

    // v14では requestPurchase が統一API
    await requestPurchase(requestParams);
  } catch (error) {
    console.error('[Token IAP] Failed to request token package purchase:', error);
    onError(error as PurchaseError);
  }
}

/**
 * トークン購入履歴の復元
 * 消費型アイテムは通常復元できないが、未完了の購入を確認
 */
export async function restoreTokenPurchases(): Promise<Purchase[]> {
  try {
    const purchases = await getAvailablePurchases();
    console.log('[Token IAP] Checking for pending token purchases:', purchases);

    // トークンパッケージのみをフィルタリング
    const tokenPurchases = purchases.filter((purchase) => {
      const productId = purchase.productId;
      return TOKEN_PRODUCT_IDS.includes(productId);
    });

    return tokenPurchases;
  } catch (error) {
    console.error('[Token IAP] Failed to restore token purchases:', error);
    return [];
  }
}

/**
 * プロダクトIDから価格表示用の文字列を生成
 */
export function formatTokenPrice(product: Product): string {
  // Productの型から価格情報を取得
  const productAny = product as any;
  return productAny.localizedPrice || productAny.price || '¥0';
}
