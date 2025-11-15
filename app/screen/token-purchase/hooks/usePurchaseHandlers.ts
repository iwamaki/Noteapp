/**
 * @file usePurchaseHandlers.ts
 * @summary Custom hook for token purchase handling
 * @description Manages token package purchases
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import type { Product, Purchase } from 'react-native-iap';
import { useSettingsStore } from '../../../settings/settingsStore';
import type { PurchaseRecord } from '../../../settings/settingsStore';
import { purchaseTokenPackage } from '../../../billing/services/tokenIapService';
import type { TokenPackage } from '../../../billing/constants/tokenPackages';
import { isUserCancelledError } from '../../../billing/utils/purchaseHelpers';
import { logger } from '../../../utils/logger';

interface UsePurchaseHandlersProps {
  tokenProducts: Product[];
}

interface UsePurchaseHandlersReturn {
  purchasing: boolean;
  handleTokenPurchase: (pkg: TokenPackage) => Promise<void>;
}

export const usePurchaseHandlers = ({
  tokenProducts,
}: UsePurchaseHandlersProps): UsePurchaseHandlersReturn => {
  const { refreshTokenBalance } = useSettingsStore();
  const [purchasing, setPurchasing] = useState(false);

  // トークンパッケージ購入処理
  const handleTokenPurchase = async (pkg: TokenPackage) => {
    // 対応する Product を探す
    const product = tokenProducts.find((p) => (p as any).id === pkg.productId);
    if (!product) {
      Alert.alert('エラー', 'この商品は現在購入できません');
      return;
    }

    setPurchasing(true);

    try {
      await purchaseTokenPackage(
        pkg.productId,
        product,
        // onSuccess
        async (purchase: Purchase) => {
          logger.info('billing', 'Purchase successful', {
            productId: purchase.productId,
            transactionIdPrefix: purchase.transactionId?.substring(0, 12)
          });

          // 購入履歴レコードを作成
          const purchaseRecord: PurchaseRecord = {
            id: purchase.transactionId || `${Date.now()}`,
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
            logger.info('billing', 'Sending credits to backend', { credits: pkg.credits });
            const { getBillingApiService } = await import('../../../billing/services/billingApiService');
            const billingService = getBillingApiService();
            await billingService.addCredits(pkg.credits, purchaseRecord);
            logger.info('billing', 'Backend verification successful');

            // ✅ バックエンド成功時のみfinishTransaction
            // バックエンド検証が成功した場合のみトランザクションを完了する
            // 失敗した場合は未完了トランザクションとして残り、アプリ再起動時に復元可能
            const { finishTransaction } = await import('react-native-iap');
            await finishTransaction({ purchase, isConsumable: true });
            logger.info('billing', 'Transaction finished successfully');

            // ローカルキャッシュを更新
            logger.debug('billing', 'Refreshing token balance');
            await refreshTokenBalance();
            logger.debug('billing', 'Token balance refreshed');

            setPurchasing(false);

            // 成功メッセージ
            Alert.alert(
              '💰 購入完了',
              `${pkg.credits}Pのクレジットを追加しました`
            );

          } catch (error) {
            // ❌ バックエンド失敗時はfinishTransactionを呼ばない
            // → 未完了トランザクションとして残る
            // → アプリ再起動時にrestoreTokenPurchases()で復元可能

            logger.error('billing', 'Backend verification failed, transaction not finished', error);

            setPurchasing(false);

            // ユーザーに適切なメッセージを表示
            // パニックを引き起こさず、クレジットが後で追加されることを伝える
            Alert.alert(
              '処理中',
              '購入の確認中です。しばらくしてから再度アプリを起動してください。\n\nクレジットは自動的に追加されます。',
              [{ text: 'OK' }]
            );
          }
        },
        // onError
        (error) => {
          logger.error('billing', 'Purchase failed', error);
          setPurchasing(false);

          if (isUserCancelledError(error)) {
            return;
          }

          Alert.alert('購入エラー', '購入処理中にエラーが発生しました');
        }
      );
    } catch (error) {
      logger.error('billing', 'Unexpected purchase error', error);
      setPurchasing(false);
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  return {
    purchasing,
    handleTokenPurchase,
  };
};
