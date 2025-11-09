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
import type { Purchase, Product } from 'react-native-iap';

/**
 * サブスクリプション画面
 */
export const SubscriptionScreen: React.FC = () => {
  const { colors, typography } = useTheme();
  const { updateSettings } = useSettingsStore();
  const { tier, expiresAt } = useSubscription();

  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedTab, setSelectedTab] = useState<'pro' | 'premium'>('pro');

  // プラン配列（ProとPremiumのみ）
  const plans = [
    { plan: SUBSCRIPTION_PLANS.pro, isCurrentPlan: tier === 'pro', isRecommended: false },
    { plan: SUBSCRIPTION_PLANS.premium, isCurrentPlan: tier === 'premium', isRecommended: false },
  ];

  // 現在選択されているプラン
  const currentPlan = plans.find(p => p.plan.id === selectedTab) || plans[0];

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

      // 商品情報を保存（offerToken取得のため）
      setAvailableProducts(products);

      // 現在のプランが有料プランの場合、実際の購入状態を確認
      if (tier === 'pro' || tier === 'premium') {
        console.log('[SubscriptionScreen] Verifying subscription status for tier:', tier);
        const purchases = await restorePurchases();
        console.log('[SubscriptionScreen] Active purchases:', purchases);

        // 購入情報がない場合、解約済みとしてダウングレード
        if (purchases.length === 0) {
          console.log('[SubscriptionScreen] No active purchases found, downgrading to free');
          updateSettings({
            subscription: {
              tier: 'free',
              status: 'expired',
              expiresAt: expiresAt, // 期限は保持（履歴として）
              trialStartedAt: undefined,
              autoRenew: false,
            },
          });
        }
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
    // Freeプランは購入対象外（現在のプランがFreeの場合のみ表示される）
    if (targetTier === 'free') {
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

    // 商品情報からofferTokenを取得（Android用）
    const product = availableProducts.find((p) => p.id === productId);
    if (!product) {
      Alert.alert('エラー', '商品情報が見つかりませんでした。画面を再読み込みしてください。');
      return;
    }

    console.log('[SubscriptionScreen] Found product:', product);

    setIsPurchasing(true);

    try {
      await purchaseSubscription(
        productId,
        product,
        (purchase: Purchase) => {
          // 購入成功
          handlePurchaseSuccess(purchase);
        },
        (error) => {
          // ユーザーがキャンセルした場合は何もしない
          const errorCode = String(error.code).toLowerCase();
          if (
            errorCode === 'e_user_cancelled' ||
            errorCode === 'user_cancelled' ||
            errorCode === 'user-cancelled'
          ) {
            console.log('[SubscriptionScreen] User cancelled purchase');
            return;
          }

          // 本当のエラーの場合のみログとアラート
          console.error('[SubscriptionScreen] Purchase error:', error);
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
      case 'premium':
        return PRODUCT_IDS.PREMIUM_MONTHLY;
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

      {/* プランカード */}
      <View style={styles.planContainer}>
        {/* プランカードコンテナ */}
        <View
          style={[
            styles.planCardContainer,
            {
              borderColor: currentPlan.isCurrentPlan
                ? colors.primary
                : colors.border,
            },
          ]}
        >
          {/* 基準カード: 親の高さを決めるため、全てのプランを非表示でレンダリング（重ねて配置） */}
          {plans.map((item, index) => (
            <View
              key={`base-${item.plan.id}`}
              style={[
                index === 0 ? {} : { position: 'absolute', top: 0, left: 0, right: 0 },
                { opacity: 0, pointerEvents: 'none' },
              ]}
            >
              <PlanCard
                plan={item.plan}
                isCurrentPlan={item.isCurrentPlan}
                isRecommended={item.isRecommended}
              />
            </View>
          ))}

          {/* 実際に表示するカード */}
          {plans.map((item) => (
            <View
              key={item.plan.id}
              style={[
                styles.cardWrapper,
                item.plan.id !== selectedTab && styles.hiddenCard,
              ]}
            >
              <PlanCard
                plan={item.plan}
                isCurrentPlan={item.isCurrentPlan}
                isRecommended={item.isRecommended}
              />
            </View>
          ))}
        </View>

        {/* タブボタン (Pro / Premium) */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              selectedTab === 'pro' && { backgroundColor: colors.primary },
              selectedTab !== 'pro' && { backgroundColor: colors.border },
            ]}
            onPress={() => setSelectedTab('pro')}
          >
            <Text
              style={[
                styles.tabButtonText,
                typography.subtitle,
                selectedTab === 'pro' && { color: colors.white },
                selectedTab !== 'pro' && { color: colors.textSecondary },
              ]}
            >
              Pro
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabButton,
              selectedTab === 'premium' && { backgroundColor: colors.primary },
              selectedTab !== 'premium' && { backgroundColor: colors.border },
            ]}
            onPress={() => setSelectedTab('premium')}
          >
            <Text
              style={[
                styles.tabButtonText,
                typography.subtitle,
                selectedTab === 'premium' && { color: colors.white },
                selectedTab !== 'premium' && { color: colors.textSecondary },
              ]}
            >
              Premium
            </Text>
          </TouchableOpacity>
        </View>

        {/* 購入ボタン */}
        {!currentPlan.isCurrentPlan ? (
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              {
                backgroundColor: colors.primary,
              },
              isPurchasing && styles.buttonDisabled,
            ]}
            onPress={() => handlePurchase(currentPlan.plan.id)}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text
                style={[
                  styles.purchaseButtonText,
                  typography.subtitle,
                  { color: colors.white },
                ]}
              >
                {currentPlan.plan.displayName}プランを購入
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.currentPlanBadge,
              { backgroundColor: colors.secondary, borderColor: colors.border },
            ]}
          >
            <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            <Text
              style={[
                styles.currentPlanText,
                typography.subtitle,
                { color: colors.text },
              ]}
            >
              現在のプラン
            </Text>
          </View>
        )}
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
          • キャンセル後も期限まで利用できます{'\n'}
          • 返金はApple/Googleのポリシーに準じます
        </Text>

        <Text style={[styles.noteTitleSecondary, typography.caption, { color: colors.textSecondary }]}>
          キャンセル・変更方法:
        </Text>
        <Text style={[styles.noteText, typography.caption, { color: colors.textSecondary }]}>
          サブスクリプションのキャンセルやプラン変更は、{'\n'}
          Google Play ストアから行ってください。{'\n'}
          {'\n'}
          手順:{'\n'}
          1. Google Play ストアアプリを開く{'\n'}
          2. プロフィール {'>'} お支払いと定期購入 {'>'} 定期購入{'\n'}
          3. 「NoteApp」を選択{'\n'}
          4. キャンセルまたは変更を選択
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
  planContainer: {
    marginBottom: 24,
  },
  planCardContainer: {
    paddingHorizontal: 20,
    position: 'relative',
    borderWidth: 2,
    borderRadius: 12,
    marginHorizontal: 20,
    overflow: 'hidden',
  },
  cardWrapper: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
  },
  hiddenCard: {
    opacity: 0,
    pointerEvents: 'none',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabButtonText: {
    fontWeight: '600',
  },
  purchaseButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
  },
  purchaseButtonText: {
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
  },
  currentPlanText: {
    marginLeft: 8,
    fontWeight: '600',
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
  noteTitleSecondary: {
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  noteText: {
    lineHeight: 20,
  },
});
