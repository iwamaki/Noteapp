/**
 * @file purchaseRestoration.ts
 * @summary Pending purchase restoration service
 * @description Processes pending (unfinished) purchases that were interrupted by crashes or network errors
 */

import type { Purchase } from 'react-native-iap';
import { finishTransaction } from 'react-native-iap';
import { getBillingApiService } from './billingApiService';
import { TOKEN_PACKAGES } from '../constants/tokenPackages';
import type { PurchaseRecord } from '../../settings/settingsStore';
import { logger } from '../../utils/logger';

/**
 * 未完了購入を処理する
 *
 * フロー:
 * 1. purchase から productId を取得
 * 2. TOKEN_PACKAGES からクレジット数を取得
 * 3. バックエンドにクレジットを追加
 * 4. 成功時のみ finishTransaction() を呼ぶ
 * 5. 失敗時はエラーをスローし、次回リトライ
 *
 * @param purchase - 未完了の購入トランザクション
 * @throws Error if backend verification fails (will be retried on next app launch)
 */
export async function processPendingPurchase(purchase: Purchase): Promise<void> {
  const productId = purchase.productId;

  logger.info('billing', 'Processing pending purchase', {
    productId,
    transactionIdPrefix: purchase.transactionId?.substring(0, 12),
  });

  // productId からクレジット数を取得
  const pkg = TOKEN_PACKAGES.find((p) => p.productId === productId);
  if (!pkg) {
    logger.error('billing', 'Unknown product ID in pending purchase', { productId });
    // 不明な商品IDの場合はfinishTransactionして削除
    await finishTransaction({ purchase, isConsumable: true });
    logger.info('billing', 'Unknown product removed from pending purchases');
    return;
  }

  // 購入レコードを作成
  const purchaseRecord: PurchaseRecord = {
    id: purchase.transactionId || `restored_${Date.now()}`,
    type: pkg.isInitial ? 'initial' : 'addon',
    productId: pkg.productId,
    purchaseToken: purchase.purchaseToken || '',
    transactionId: purchase.transactionId || '',
    purchaseDate: new Date(purchase.transactionDate).toISOString(),
    amount: pkg.price,
    creditsAdded: pkg.credits,
  };

  try {
    // バックエンドにクレジットを追加
    const billingService = getBillingApiService();
    await billingService.addCredits(pkg.credits, purchaseRecord);

    logger.info('billing', 'Backend verification successful for pending purchase', {
      productId,
      credits: pkg.credits,
    });

    // 成功時のみfinishTransaction
    await finishTransaction({ purchase, isConsumable: true });

    logger.info('billing', 'Pending purchase completed successfully', {
      productId,
      credits: pkg.credits,
    });
  } catch (error: any) {
    // エラーレスポンスのステータスコードをチェック
    // Axiosのエラー構造: error.status または error.response?.status
    const statusCode = error?.status || error?.response?.status;
    const errorMessage = error?.message || String(error);

    logger.debug('billing', 'Error caught in processPendingPurchase', {
      productId,
      statusCode,
      errorCode: error?.code,
      errorMessage,
      fullError: JSON.stringify(error, null, 2).substring(0, 500),
    });

    // 409 Conflict: 既に処理済み
    // statusCode チェックとメッセージチェックの両方を試みる
    const is409Error =
      statusCode === 409 ||
      errorMessage.includes('409') ||
      errorMessage.includes('Purchase already processed') ||
      errorMessage.includes('already processed');

    if (is409Error) {
      logger.info('billing', 'Purchase already processed (409), finishing transaction', {
        productId,
      });
      await finishTransaction({ purchase, isConsumable: true });
      logger.info('billing', 'Transaction finished for already-processed purchase');
      return;
    }

    // 400 Bad Request: レシート検証失敗（不正な購入）
    const is400Error =
      statusCode === 400 ||
      errorMessage.includes('400') ||
      errorMessage.includes('Invalid receipt');

    if (is400Error) {
      logger.warn('billing', 'Invalid receipt (400), finishing transaction', {
        productId,
        error: errorMessage,
      });
      await finishTransaction({ purchase, isConsumable: true });
      logger.info('billing', 'Transaction finished for invalid receipt');
      return;
    }

    // その他のエラー（ネットワークエラーなど）: リトライ可能
    // エラーをスローして、次回アプリ起動時に再度リトライ
    logger.error('billing', 'Failed to process pending purchase, will retry on next launch', {
      productId,
      statusCode,
      error: error?.message,
    });
    throw error;
  }
}
