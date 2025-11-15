/**
 * @file restorePendingPurchases.ts
 * @summary Pending purchases restoration task
 * @description Detects and processes pending (unfinished) purchase transactions on app startup
 */

import type { Purchase, PurchaseError } from 'react-native-iap';
import { purchaseUpdatedListener, purchaseErrorListener, getAvailablePurchases } from 'react-native-iap';
import { InitializationTask, InitializationStage, TaskPriority } from '../types';
import { initializeTokenIAP } from '../../billing/services/tokenIapService';
import { processPendingPurchase } from '../../billing/services/purchaseRestoration';
import { TOKEN_PACKAGES } from '../../billing/constants/tokenPackages';
import { logger } from '../../utils/logger';

/**
 * 未完了購入の復元タスク
 *
 * アプリ起動時に実行され、未完了の購入トランザクションを検出・処理します。
 *
 * 実行条件:
 * - デバイス認証完了後
 * - Billing Service初期化完了後
 *
 * 処理フロー:
 * 1. IAP接続を初期化
 * 2. 未完了購入を検索
 * 3. 各購入をprocessPendingPurchase()で処理
 * 4. バックエンド検証成功後にfinishTransaction
 *
 * Google Playは3日以内にacknowledgeされない購入を自動返金するため、
 * この処理は非常に重要です。
 */
export const restorePendingPurchasesTask: InitializationTask = {
  id: 'restore-pending-purchases',
  name: '未完了購入の復元',
  description: '未完了の購入トランザクションを検出し、クレジットを追加します',
  stage: InitializationStage.SERVICES,  // ✅ SERVICES に変更（Billing初期化後に実行）
  priority: TaskPriority.HIGH,
  timeout: 30000, // 30秒
  retry: {
    maxAttempts: 3,
    delayMs: 2000, // 2秒
    exponentialBackoff: true,
  },
  dependencies: ['authenticate_device', 'initialize-billing-service'],  // ✅ 正しいタスクID

  execute: async () => {
    // リスナー復元用の変数
    let purchaseUpdateSubscription: any = null;
    let purchaseErrorSubscription: any = null;
    const pendingPurchases: Purchase[] = [];
    const processedPurchases = new Set<string>();

    try {
      // IAP接続を初期化（既に初期化済みの場合はスキップされる）
      logger.info('billing', 'Initializing IAP for pending purchase restoration');
      await initializeTokenIAP();
      logger.info('billing', 'IAP connection ready');

      // 未完了購入を検出するためのPromise
      const pendingPurchaseDetectionPromise = new Promise<void>((resolve) => {
        const timeoutId = setTimeout(() => {
          // 5秒以内に pending purchases が見つからなければ完了
          logger.debug('billing', 'Pending purchase detection timeout, proceeding');
          resolve();
        }, 5000);

        // purchaseUpdatedListener を設定
        // これにより、pending purchases が自動的にトリガーされる
        purchaseUpdateSubscription = purchaseUpdatedListener((purchase: Purchase) => {
          const transactionId = purchase.transactionId || 'unknown';

          // 重複チェック
          if (processedPurchases.has(transactionId)) {
            logger.debug('billing', 'Duplicate purchase detected, skipping', { transactionId });
            return;
          }

          logger.info('billing', 'Pending purchase detected via listener', {
            productId: purchase.productId,
            transactionIdPrefix: transactionId.substring(0, 12),
          });

          processedPurchases.add(transactionId);
          pendingPurchases.push(purchase);

          // 購入が検出されたらタイムアウトをクリア
          clearTimeout(timeoutId);
        });

        // エラーリスナーも設定（ログ記録のみ）
        purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
          logger.warn('billing', 'Purchase error during restoration', { error: error.message });
        });
      });

      // pending purchases の検出を待機
      await pendingPurchaseDetectionPromise;

      // リスナーをクリーンアップ
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
        purchaseUpdateSubscription = null;
      }
      if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
        purchaseErrorSubscription = null;
      }

      // リスナーで検出されなかった場合、手動で getAvailablePurchases() を呼ぶ
      if (pendingPurchases.length === 0) {
        logger.debug('billing', 'No purchases detected via listener, trying getAvailablePurchases()');

        try {
          const availablePurchases = await getAvailablePurchases();
          logger.info('billing', 'getAvailablePurchases() returned', {
            totalPurchases: availablePurchases.length,
          });

          // トークンパッケージのみをフィルタリング
          const tokenProductIds = TOKEN_PACKAGES.map(pkg => pkg.productId);
          const tokenPurchases = availablePurchases.filter((purchase) => {
            const productId = purchase.productId;
            return tokenProductIds.includes(productId);
          });

          logger.info('billing', 'Token purchases found via getAvailablePurchases()', {
            count: tokenPurchases.length,
          });

          // 重複チェックして追加
          for (const purchase of tokenPurchases) {
            const transactionId = purchase.transactionId || 'unknown';
            if (!processedPurchases.has(transactionId)) {
              processedPurchases.add(transactionId);
              pendingPurchases.push(purchase);
            }
          }
        } catch (error) {
          logger.error('billing', 'Failed to call getAvailablePurchases()', error);
        }
      }

      if (pendingPurchases.length === 0) {
        logger.info('billing', 'No pending purchases found (checked both listener and getAvailablePurchases)');
        return;
      }

      logger.info('billing', 'Found pending purchases', {
        count: pendingPurchases.length,
      });

      // 各未完了購入を処理
      let successCount = 0;
      let failCount = 0;

      for (const purchase of pendingPurchases) {
        try {
          await processPendingPurchase(purchase);
          successCount++;
        } catch (error) {
          // 個別の購入処理失敗は記録するが、全体の処理は継続
          failCount++;
          logger.error('billing', 'Failed to process individual pending purchase', {
            productId: purchase.productId,
            error,
          });
        }
      }

      logger.info('billing', 'Pending purchase restoration completed', {
        total: pendingPurchases.length,
        success: successCount,
        failed: failCount,
      });

      // 一部でも失敗した場合はエラーをスロー（次回リトライ）
      if (failCount > 0) {
        throw new Error(`Failed to process ${failCount} pending purchases`);
      }
    } catch (error) {
      // クリーンアップ
      if (purchaseUpdateSubscription) {
        purchaseUpdateSubscription.remove();
      }
      if (purchaseErrorSubscription) {
        purchaseErrorSubscription.remove();
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('billing', 'Pending purchase restoration failed', { error: errorMessage });
      throw new Error(`Pending purchase restoration failed: ${errorMessage}`);
    }
  },

  fallback: async (error: Error) => {
    // フォールバック: 復元処理の失敗はアプリ起動を阻害しない
    // 次回アプリ起動時に再度リトライされる
    logger.warn('billing', 'Using fallback - Pending purchases will be retried on next launch', {
      error: error.message,
    });
  },
};
