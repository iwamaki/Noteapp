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
  purchaseUpdatedListener,
  purchaseErrorListener,
  getAvailablePurchases,
} from 'react-native-iap';
import type {
  Product,
  Purchase,
  PurchaseError,
} from 'react-native-iap';

import { TOKEN_PACKAGES } from '../constants/tokenPackages';
import { logger } from '../../../utils/logger';

/**
 * トークン購入 プロダクトID定義
 * TOKEN_PACKAGES から自動的に取得
 */
export const TOKEN_PRODUCT_IDS = TOKEN_PACKAGES.map((pkg) => pkg.productId);

/**
 * Check if an error is a user cancellation
 */
export const isUserCancelledError = (error: any): boolean => {
  const errorCode = String(error.code).toLowerCase();
  return (
    errorCode === 'e_user_cancelled' ||
    errorCode === 'user_cancelled' ||
    errorCode === 'user-cancelled'
  );
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
export async function initializeTokenIAP(): Promise<void> {
  if (isInitialized) {
    return;
  }

  try {
    await initConnection();
    isInitialized = true;
    logger.info('billing', 'Token IAP connection initialized');
  } catch (error) {
    logger.error('billing', 'Failed to initialize Token IAP connection', error);
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
    logger.info('billing', 'Token IAP connection ended');
  } catch (error) {
    logger.error('billing', 'Failed to end Token IAP connection', error);
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
    logger.info('billing', 'Available token packages retrieved', {
      count: products?.length || 0
    });
    return (products as Product[]) || [];
  } catch (error) {
    logger.error('billing', 'Failed to get token packages', error);
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
  logger.info('billing', 'Purchase token package initiated', { productId });

  // 既存のリスナーを解除（重複登録を防ぐ）
  if (purchaseUpdateSubscription) {
    logger.debug('billing', 'Removing existing purchase update listener');
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }
  if (purchaseErrorSubscription) {
    logger.debug('billing', 'Removing existing purchase error listener');
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }

  // 購入更新リスナーを設定
  purchaseUpdateSubscription = purchaseUpdatedListener((purchase: Purchase) => {
    logger.info('billing', 'Token package purchase updated', {
      productId: purchase.productId,
      transactionId: purchase.transactionId?.substring(0, 12)
    });

    // レシート検証（Phase 1では簡易的）
    const receipt = purchase.transactionId;
    if (receipt) {
      // ⚠️ 重要: finishTransactionは呼ばない
      // 理由: バックエンドで検証してからacknowledgeする必要がある
      // finishTransactionを先に呼ぶとGoogle側で消費済みになり、バックエンドの検証が失敗する
      // finishTransactionはバックエンドのAPI呼び出し成功後に呼ぶ
      logger.debug('billing', 'Calling onSuccess without finishTransaction (backend verification required)');
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
      logger.info('billing', 'User cancelled token package purchase');
    } else {
      logger.error('billing', 'Token package purchase error', error);
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

    logger.debug('billing', 'Requesting token package purchase', { productId });

    // v14では requestPurchase が統一API
    await requestPurchase(requestParams);
  } catch (error) {
    logger.error('billing', 'Failed to request token package purchase', error);
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
    logger.info('billing', 'Checking for pending token purchases', {
      totalPurchases: purchases.length
    });

    // トークンパッケージのみをフィルタリング
    const tokenPurchases = purchases.filter((purchase) => {
      const productId = purchase.productId;
      return TOKEN_PRODUCT_IDS.includes(productId);
    });

    logger.info('billing', 'Token purchases found', {
      count: tokenPurchases.length
    });

    return tokenPurchases;
  } catch (error) {
    logger.error('billing', 'Failed to restore token purchases', error);
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
