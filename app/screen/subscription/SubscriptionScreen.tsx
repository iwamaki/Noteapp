/**
 * @file SubscriptionScreen.tsx
 * @summary サブスクリプション管理画面
 * @description
 * ユーザーがプランを確認・購入・管理する画面。
 * - 利用可能なプラン一覧
 * - 現在のプラン表示
 * - 購入フロー
 * - 復元機能
 */

import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../design/theme/ThemeContext';
import { useSettingsStore } from '../../settings/settingsStore';
import { useSubscription } from '../../utils/subscriptionHelpers';
import { PlanCard } from './components/PlanCard';
import {
  initializeIAP,
  purchaseSubscription,
  restorePurchases,
  getTierFromProductId,
  getSubscriptionExpiry,
  PRODUCT_IDS,
} from '../../data/services/iapService';
import {
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
} from '../../constants/plans';
import type { Purchase } from 'react-native-iap';

/**
 * サブスクリプション画面
 */
export const SubscriptionScreen: React.FC = () => {
  const { colors, typography } = useTheme();
  const { settings, updateSettings } = useSettingsStore();
  const { tier, status, expiresAt } = useSubscription();

  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // 初期化: IAPの接続と利用可能な商品の取得
  useEffect(() => {
    initializeScreen();

    return () => {
      // クリーンアップは不要（グローバルな接続を維持）
    };
  }, []);

  const initializeScreen = async () => {
    try {
      setIsLoading(true);
      await initializeIAP();

      // 商品情報を取得
      const { getAvailableSubscriptions } = await import('../../data/services/iapService');
      const products = await getAvailableSubscriptions();
      console.log('[SubscriptionScreen] Available products:', products);

      if (products.length === 0) {
        console.warn('[SubscriptionScreen] No products found');
        Alert.alert('警告', 'サブスクリプション商品が見つかりませんでした。Play Consoleの設定を確認してください。');
      }
    } catch (error) {
      console.error('[SubscriptionScreen] Failed to initialize:', error);
      Alert.alert('エラー', 'サブスクリプション情報の取得に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // 購入処理
  const handlePurchase = async (targetTier: SubscriptionTier) => {
    if (targetTier === 'free') {
      // Freeプランへのダウングレード確認
      Alert.alert(
        'プランのダウングレード',
        'Freeプランに変更しますか？現在のサブスクリプションをキャンセルする必要があります。',
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: 'ダウングレード',
            onPress: () => {
              // TODO: サブスクリプションキャンセル処理（Phase 2で実装）
              updateSettings({
                subscription: {
                  ...settings.subscription,
                  tier: 'free',
                  status: 'none',
                  expiresAt: undefined,
                },
              });
              Alert.alert('完了', 'Freeプランに変更しました。');
            },
          },
        ],
      );
      return;
    }

    // プロダクトIDを取得
    const productId = getProductIdForTier(targetTier);
    console.log('[SubscriptionScreen] Target tier:', targetTier);
    console.log('[SubscriptionScreen] Product ID:', productId);
    console.log('[SubscriptionScreen] All PRODUCT_IDS:', PRODUCT_IDS);

    if (!productId) {
      Alert.alert('エラー', 'このプランは現在利用できません。');
      return;
    }

    setIsPurchasing(true);

    try {
      await purchaseSubscription(
        productId,
        (purchase: Purchase) => {
          // 購入成功
          handlePurchaseSuccess(purchase);
        },
        (error) => {
          // 購入エラー
          console.error('[SubscriptionScreen] Purchase error:', error);

          // ユーザーがキャンセルした場合は何もしない
          const errorCode = String(error.code);
          if (errorCode === 'E_USER_CANCELLED' || errorCode === 'USER_CANCELLED') {
            return;
          }

          Alert.alert('購入エラー', '購入処理に失敗しました。');
        },
      );
    } catch (error) {
      console.error('[SubscriptionScreen] Purchase failed:', error);
      Alert.alert('エラー', '購入リクエストに失敗しました。');
    } finally {
      setIsPurchasing(false);
    }
  };

  // 購入成功時の処理
  const handlePurchaseSuccess = (purchase: Purchase) => {
    const newTier = getTierFromProductId(purchase.productId);
    const expiryDate = getSubscriptionExpiry(purchase);

    updateSettings({
      subscription: {
        tier: newTier,
        status: 'active',
        expiresAt: expiryDate.toISOString(),
        trialStartedAt: undefined,
        autoRenew: true,
      },
    });

    Alert.alert(
      '購入完了',
      `${SUBSCRIPTION_PLANS[newTier].displayName}プランへようこそ！`,
    );
  };

  // 購入の復元
  const handleRestore = async () => {
    setIsRestoring(true);

    try {
      const purchases = await restorePurchases();

      if (purchases.length === 0) {
        Alert.alert('復元結果', '復元可能な購入が見つかりませんでした。');
        return;
      }

      // 最新の購入を使用
      const latestPurchase = purchases[0];
      handlePurchaseSuccess(latestPurchase as any);
    } catch (error) {
      console.error('[SubscriptionScreen] Restore failed:', error);
      Alert.alert('エラー', '購入の復元に失敗しました。');
    } finally {
      setIsRestoring(false);
    }
  };

  // プロダクトIDを取得
  const getProductIdForTier = (targetTier: SubscriptionTier): string | null => {
    switch (targetTier) {
      case 'pro':
        return PRODUCT_IDS.PRO_MONTHLY;
      case 'enterprise':
        return PRODUCT_IDS.ENTERPRISE_MONTHLY;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, typography.body, { color: colors.textSecondary }]}>
          プラン情報を読み込み中...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.contentContainer}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={[styles.title, typography.title, { color: colors.text }]}>
          プランを選択
        </Text>
        <Text style={[styles.subtitle, typography.body, { color: colors.textSecondary }]}>
          あなたに最適なプランをお選びください
        </Text>
      </View>

      {/* 現在のプラン情報 */}
      {status !== 'none' && (
        <View
          style={[
            styles.currentPlanContainer,
            { backgroundColor: colors.secondary, borderColor: colors.border },
          ]}
        >
          <View style={styles.currentPlanHeader}>
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text
              style={[
                styles.currentPlanTitle,
                typography.subtitle,
                { color: colors.text },
              ]}
            >
              現在のプラン: {SUBSCRIPTION_PLANS[tier].displayName}
            </Text>
          </View>
          {expiresAt && (
            <Text style={[styles.expiryText, typography.caption, { color: colors.textSecondary }]}>
              有効期限: {new Date(expiresAt).toLocaleDateString('ja-JP')}
            </Text>
          )}
        </View>
      )}

      {/* プランカード */}
      <View style={styles.plansContainer}>
        <PlanCard
          plan={SUBSCRIPTION_PLANS.free}
          isCurrentPlan={tier === 'free'}
          onPurchase={handlePurchase}
          isPurchasing={isPurchasing}
        />
        <PlanCard
          plan={SUBSCRIPTION_PLANS.pro}
          isCurrentPlan={tier === 'pro'}
          isRecommended={true}
          onPurchase={handlePurchase}
          isPurchasing={isPurchasing}
        />
        <PlanCard
          plan={SUBSCRIPTION_PLANS.enterprise}
          isCurrentPlan={tier === 'enterprise'}
          onPurchase={handlePurchase}
          isPurchasing={isPurchasing}
        />
      </View>

      {/* 復元ボタン */}
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={isRestoring}
      >
        {isRestoring ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Ionicons name="refresh" size={20} color={colors.primary} />
            <Text
              style={[
                styles.restoreText,
                typography.body,
                { color: colors.primary },
              ]}
            >
              購入を復元
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* 注意事項 */}
      <View style={styles.notesContainer}>
        <Text style={[styles.noteTitle, typography.caption, { color: colors.textSecondary }]}>
          注意事項:
        </Text>
        <Text style={[styles.noteText, typography.caption, { color: colors.textSecondary }]}>
          • サブスクリプションは自動更新されます{'\n'}
          • いつでもキャンセル可能です{'\n'}
          • キャンセル後も期限まで利用できます{'\n'}
          • 返金はApple/Googleのポリシーに準じます
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  contentContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {},
  currentPlanContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 24,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  currentPlanTitle: {
    marginLeft: 8,
  },
  expiryText: {},
  plansContainer: {
    marginBottom: 24,
  },
  restoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 24,
  },
  restoreText: {
    marginLeft: 8,
  },
  notesContainer: {
    padding: 16,
    marginBottom: 24,
  },
  noteTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  noteText: {
    lineHeight: 20,
  },
});
