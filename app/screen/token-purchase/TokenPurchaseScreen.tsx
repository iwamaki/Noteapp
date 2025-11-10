/**
 * @file TokenPurchaseScreen.tsx
 * @summary トークン購入 & サブスクリプション管理画面
 * @description サブスクリプション購入とトークンパッケージ購入を統合した画面。
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../design/theme/ThemeContext';
import { useSubscription } from '../../billing/utils/subscriptionHelpers';
import { SUBSCRIPTION_PLANS } from '../../billing/constants/plans';
import { SUBSCRIPTION_PRODUCT_IDS as PRODUCT_IDS } from '../../billing/services/subscriptionIapService';

// Components
import { PlanCard } from './components/PlanCard';
import { TokenPackageCard } from './components/TokenPackageCard';
import { TabSelector } from './components/TabSelector';
import { NoticeCard } from './components/NoticeCard';

// Hooks
import { useProductLoader } from './hooks/useProductLoader';
import { usePurchaseHandlers } from './hooks/usePurchaseHandlers';

type TabType = 'subscription' | 'tokens';

export default function TokenPurchaseScreen() {
  const { colors } = useTheme();
  const { tier, status, isActive } = useSubscription();

  // タブ選択
  const [selectedTab, setSelectedTab] = useState<TabType>('subscription');

  // 商品読み込み
  const {
    loading,
    tokenProducts,
    subscriptionProducts,
    availablePackages,
  } = useProductLoader();

  // 購入処理
  const {
    purchasing,
    isRestoring,
    handleSubscriptionPurchase,
    handleTokenPurchase,
    handleRestore,
  } = usePurchaseHandlers({
    subscriptionProducts,
    tokenProducts,
  });

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* タブ切り替え */}
      <TabSelector
        selectedTab={selectedTab}
        onTabChange={setSelectedTab}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* サブスクリプションタブの内容 */}
        {selectedTab === 'subscription' && (
          <>
            <View style={styles.packagesContainer}>
              {/* Standard プラン */}
              <PlanCard
                plan={SUBSCRIPTION_PLANS.standard}
                product={subscriptionProducts.find((p) => p.id === PRODUCT_IDS.STANDARD_MONTHLY)}
                isCurrentPlan={tier === 'standard' && isActive}
                isCanceled={tier === 'standard' && status === 'canceled'}
                purchasing={purchasing}
                onPurchase={handleSubscriptionPurchase}
              />

              {/* Pro プラン */}
              <PlanCard
                plan={SUBSCRIPTION_PLANS.pro}
                product={subscriptionProducts.find((p) => p.id === PRODUCT_IDS.PRO_MONTHLY)}
                isCurrentPlan={tier === 'pro' && isActive}
                isCanceled={tier === 'pro' && status === 'canceled'}
                purchasing={purchasing}
                onPurchase={handleSubscriptionPurchase}
              />

              {/* Premium プラン */}
              <PlanCard
                plan={SUBSCRIPTION_PLANS.premium}
                product={subscriptionProducts.find((p) => p.id === PRODUCT_IDS.PREMIUM_MONTHLY)}
                isCurrentPlan={tier === 'premium' && isActive}
                isCanceled={tier === 'premium' && status === 'canceled'}
                purchasing={purchasing}
                onPurchase={handleSubscriptionPurchase}
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
                  <Text style={[styles.restoreText, { color: colors.primary }]}>
                    購入を復元
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* 注意事項 */}
            <NoticeCard
              title="注意事項:"
              text="• サブスクリプションは自動更新されます&#10;• キャンセル後も期限まで利用できます&#10;• 返金はApple/Googleのポリシーに準じます"
            />
          </>
        )}

        {/* トークンパッケージタブの内容 */}
        {selectedTab === 'tokens' && (
          <>
            {/* Flash トークンパッケージ */}
            {availablePackages.filter(pkg => pkg.tokens.flash > 0).length > 0 && (
              <View style={styles.packagesContainer}>
                {availablePackages
                  .filter(pkg => pkg.tokens.flash > 0)
                  .map((pkg) => (
                    <TokenPackageCard
                      key={pkg.id}
                      package={pkg}
                      product={tokenProducts.find((p) => (p as any).id === pkg.productId)}
                      purchasing={purchasing}
                      onPurchase={handleTokenPurchase}
                    />
                  ))}
              </View>
            )}

            {/* Pro トークンパッケージ */}
            {availablePackages.filter(pkg => pkg.tokens.pro > 0).length > 0 && (
              <View style={styles.packagesContainer}>
                {availablePackages
                  .filter(pkg => pkg.tokens.pro > 0)
                  .map((pkg) => (
                    <TokenPackageCard
                      key={pkg.id}
                      package={pkg}
                      product={tokenProducts.find((p) => (p as any).id === pkg.productId)}
                      purchasing={purchasing}
                      onPurchase={handleTokenPurchase}
                    />
                  ))}
              </View>
            )}

            {/* 注意事項 */}
            <NoticeCard
              title="ご注意"
              text="• トークンは購入後すぐに残高に追加されます&#10;• 購入したトークンに有効期限はありません&#10;• トークンの返金はできません"
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  packagesContainer: {
    gap: 16,
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
    fontSize: 16,
  },
});
