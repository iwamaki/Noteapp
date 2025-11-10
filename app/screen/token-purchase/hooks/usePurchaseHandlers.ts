/**
 * @file usePurchaseHandlers.ts
 * @summary Custom hook for purchase handling
 * @description Manages subscription and token package purchases
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Product, Purchase } from 'react-native-iap';
import { useSettingsStore } from '../../../settings/settingsStore';
import type { PurchaseRecord } from '../../../settings/settingsStore';
import {
  purchaseSubscription,
  getTierFromProductId,
  getSubscriptionExpiry,
  restoreSubscriptions,
} from '../../../billing/services/subscriptionIapService';
import { purchaseTokenPackage } from '../../../billing/services/tokenIapService';
import { finishTransaction } from 'react-native-iap';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '../../../billing/constants/plans';
import type { TokenPackage } from '../../../billing/constants/tokenPackages';
import { formatTokenAmount } from '../../../billing/constants/tokenPackages';
import { isUserCancelledError, getProductIdForTier } from '../../../billing/utils/purchaseHelpers';
import { verifyAndSyncPurchase } from '../../../billing/services/subscriptionSyncService';

interface UsePurchaseHandlersProps {
  subscriptionProducts: Product[];
  tokenProducts: Product[];
}

interface UsePurchaseHandlersReturn {
  purchasing: boolean;
  isRestoring: boolean;
  handleSubscriptionPurchase: (targetTier: SubscriptionTier) => Promise<void>;
  handleTokenPurchase: (pkg: TokenPackage) => Promise<void>;
  handleRestore: () => Promise<void>;
}

export const usePurchaseHandlers = ({
  subscriptionProducts,
  tokenProducts,
}: UsePurchaseHandlersProps): UsePurchaseHandlersReturn => {
  const navigation = useNavigation();
  const { addTokens, updateSettings } = useSettingsStore();
  const [purchasing, setPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // サブスクリプション購入成功時の処理
  const handleSubscriptionPurchaseSuccess = async (purchase: Purchase) => {
    const newTier = getTierFromProductId(purchase.productId);

    try {
      // Phase 2: バックエンドでレシート検証
      console.log('[usePurchaseHandlers] Verifying receipt with backend...');
      const verified = await verifyAndSyncPurchase(purchase);

      if (verified) {
        console.log('[usePurchaseHandlers] Receipt verified successfully');

        // 検証成功後にトランザクションを完了
        await finishTransaction({ purchase, isConsumable: false });
        console.log('[usePurchaseHandlers] Transaction finished after verification');

        Alert.alert(
          '購入完了',
          `${SUBSCRIPTION_PLANS[newTier].displayName}プランへようこそ！`,
        );
      } else {
        // 検証失敗時はローカルで更新（フォールバック）
        console.warn('[usePurchaseHandlers] Backend verification failed, using local update');
        const expiryDate = getSubscriptionExpiry(purchase);

        await updateSettings({
          subscription: {
            tier: newTier,
            status: 'active',
            expiresAt: expiryDate.toISOString(),
            trialStartedAt: undefined,
            autoRenew: true,
          },
        });

        // フォールバックの場合もトランザクションを完了
        await finishTransaction({ purchase, isConsumable: false });
        console.log('[usePurchaseHandlers] Transaction finished after fallback');

        Alert.alert(
          '購入完了',
          `${SUBSCRIPTION_PLANS[newTier].displayName}プランへようこそ！\n\n（オフラインモード）`,
        );
      }
    } catch (error) {
      console.error('[usePurchaseHandlers] Error in handleSubscriptionPurchaseSuccess:', error);

      // エラーが発生してもトランザクションは完了させる（購入は成功しているため）
      try {
        await finishTransaction({ purchase, isConsumable: false });
        console.log('[usePurchaseHandlers] Transaction finished after error');
      } catch (finishError) {
        console.error('[usePurchaseHandlers] Failed to finish transaction:', finishError);
      }

      Alert.alert('エラー', '購入処理中にエラーが発生しました。アプリを再起動してください。');
    }
  };

  // サブスクリプション購入処理
  const handleSubscriptionPurchase = async (targetTier: SubscriptionTier) => {
    if (targetTier === 'free') {
      return;
    }

    const productId = getProductIdForTier(targetTier);
    if (!productId) {
      Alert.alert('エラー', 'このプランは現在利用できません。');
      return;
    }

    const product = subscriptionProducts.find((p) => p.id === productId);
    if (!product) {
      Alert.alert('エラー', '商品情報が見つかりませんでした。画面を再読み込みしてください。');
      return;
    }

    setPurchasing(true);

    try {
      await purchaseSubscription(
        productId,
        product,
        async (purchase: Purchase) => {
          await handleSubscriptionPurchaseSuccess(purchase);
          setPurchasing(false);
        },
        (error) => {
          setPurchasing(false);

          if (isUserCancelledError(error)) {
            console.log('[usePurchaseHandlers] User cancelled subscription purchase');
            return;
          }

          console.error('[usePurchaseHandlers] Subscription purchase error:', error);
          Alert.alert('購入エラー', '購入処理に失敗しました。');
        },
      );
    } catch (error) {
      console.error('[usePurchaseHandlers] Subscription purchase failed:', error);
      Alert.alert('エラー', '購入リクエストに失敗しました。');
      setPurchasing(false);
    }
  };

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
                  tokensAdded: {
                    flash: pkg.tokens.flash,
                    pro: pkg.tokens.pro,
                  },
                };

                // トークン残高を更新
                await addTokens(pkg.tokens.flash, pkg.tokens.pro, mockPurchaseRecord);

                const tokenMsg = pkg.tokens.flash > 0
                  ? `${formatTokenAmount(pkg.tokens.flash)} Flash トークンを追加しました`
                  : `${formatTokenAmount(pkg.tokens.pro)} Pro トークンを追加しました`;

                Alert.alert(
                  '購入完了（開発モード）',
                  tokenMsg,
                  [{ text: 'OK', onPress: () => (navigation as any).goBack() }]
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
            tokensAdded: {
              flash: pkg.tokens.flash,
              pro: pkg.tokens.pro,
            },
          };

          // トークン残高を更新
          await addTokens(pkg.tokens.flash, pkg.tokens.pro, purchaseRecord);

          setPurchasing(false);

          // 成功メッセージ
          const tokenMsg = pkg.tokens.flash > 0
            ? `${formatTokenAmount(pkg.tokens.flash)} Flash トークンを追加しました`
            : `${formatTokenAmount(pkg.tokens.pro)} Pro トークンを追加しました`;

          Alert.alert(
            '購入完了',
            tokenMsg,
            [
              {
                text: 'OK',
                onPress: () => (navigation as any).goBack(),
              },
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

  // 購入の復元
  const handleRestore = async () => {
    setIsRestoring(true);

    try {
      const purchases = await restoreSubscriptions();

      if (purchases.length === 0) {
        Alert.alert('復元結果', '復元可能な購入が見つかりませんでした。');
        return;
      }

      const latestPurchase = purchases[0];
      await handleSubscriptionPurchaseSuccess(latestPurchase as any);
    } catch (error) {
      console.error('[usePurchaseHandlers] Restore failed:', error);
      Alert.alert('エラー', '購入の復元に失敗しました。');
    } finally {
      setIsRestoring(false);
    }
  };

  return {
    purchasing,
    isRestoring,
    handleSubscriptionPurchase,
    handleTokenPurchase,
    handleRestore,
  };
};
