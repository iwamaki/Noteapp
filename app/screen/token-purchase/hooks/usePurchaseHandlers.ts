/**
 * @file usePurchaseHandlers.ts
 * @summary Custom hook for token purchase handling
 * @description Manages token package purchases
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Product, Purchase } from 'react-native-iap';
import { useSettingsStore } from '../../../settings/settingsStore';
import type { PurchaseRecord } from '../../../settings/settingsStore';
import { purchaseTokenPackage } from '../../../billing/services/tokenIapService';
import type { TokenPackage } from '../../../billing/constants/tokenPackages';
import { formatTokenAmount } from '../../../billing/constants/tokenPackages';
import { isUserCancelledError } from '../../../billing/utils/purchaseHelpers';

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
  const navigation = useNavigation();
  const { addCredits } = useSettingsStore();
  const [purchasing, setPurchasing] = useState(false);

  // トークンパッケージ購入処理
  const handleTokenPurchase = async (pkg: TokenPackage) => {
    // 開発モード: モック購入
    if (__DEV__ && tokenProducts.length === 0) {
      console.log('[usePurchaseHandlers] DEV MODE: Mock purchase for package:', pkg.id);
      Alert.alert(
        '開発モード - モック購入',
        `${pkg.name}パッケージ（${pkg.price}円）の購入をシミュレートしますか？\n\n実際の課金は発生しません。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '購入',
            onPress: async () => {
              setPurchasing(true);
              try {
                // モック購入履歴レコード
                const mockPurchaseRecord: PurchaseRecord = {
                  id: `mock_${Date.now()}`,
                  type: pkg.isInitial ? 'initial' : 'addon',
                  productId: pkg.productId,
                  transactionId: `mock_transaction_${Date.now()}`,
                  purchaseDate: new Date().toISOString(),
                  amount: pkg.price,
                  creditsAdded: pkg.credits,
                };

                // クレジットを追加
                await addCredits(pkg.credits, mockPurchaseRecord);

                Alert.alert(
                  '💰 購入完了（開発モード）',
                  `${pkg.credits}Pのクレジットを追加しました`,
                  [
                    { text: 'OK', onPress: () => (navigation as any).goBack() },
                  ]
                );
              } catch (error) {
                console.error('[usePurchaseHandlers] Mock purchase error:', error);
                Alert.alert('エラー', 'モック購入中にエラーが発生しました');
              } finally {
                setPurchasing(false);
              }
            },
          },
        ]
      );
      return;
    }

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
          console.log('[usePurchaseHandlers] Purchase successful:', purchase);

          // 購入履歴レコードを作成
          const purchaseRecord: PurchaseRecord = {
            id: purchase.transactionId || `${Date.now()}`,
            type: pkg.isInitial ? 'initial' : 'addon',
            productId: pkg.productId,
            transactionId: purchase.transactionId || '',
            purchaseDate: new Date(purchase.transactionDate).toISOString(),
            amount: pkg.price,
            creditsAdded: pkg.credits,
          };

          // クレジットを追加
          await addCredits(pkg.credits, purchaseRecord);

          setPurchasing(false);

          // 成功メッセージ
          Alert.alert(
            '💰 購入完了',
            `${pkg.credits}Pのクレジットを追加しました`,
            [
              { text: 'OK', onPress: () => (navigation as any).goBack() },
            ]
          );
        },
        // onError
        (error) => {
          console.error('[usePurchaseHandlers] Purchase failed:', error);
          setPurchasing(false);

          if (isUserCancelledError(error)) {
            return;
          }

          Alert.alert('購入エラー', '購入処理中にエラーが発生しました');
        }
      );
    } catch (error) {
      console.error('[usePurchaseHandlers] Unexpected error:', error);
      setPurchasing(false);
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  return {
    purchasing,
    handleTokenPurchase,
  };
};
