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

import { useSettingsStore } from '../../settings/settingsStore';
import { useTheme } from '../../design/theme/ThemeContext';
import { useSubscription } from '../../utils/subscriptionHelpers';
import { SUBSCRIPTION_PLANS } from '../../constants/plans';
import { PRODUCT_IDS } from '../../data/services/iapService';

// Components
import { PlanCard } from './components/PlanCard';
import { TokenPackageCard } from './components/TokenPackageCard';
import { TabSelector } from './components/TabSelector';
import { BalanceDisplay } from './components/BalanceDisplay';
import { NoticeCard } from './components/NoticeCard';

// Hooks
import { useProductLoader } from './hooks/useProductLoader';
import { usePurchaseHandlers } from './hooks/usePurchaseHandlers';

type TabType = 'subscription' | 'tokens';

export default function TokenPurchaseScreen() {
  const { colors } = useTheme();
  const { settings } = useSettingsStore();
  const { tier } = useSubscription();

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
        primaryColor={colors.primary}
        secondaryColor={colors.secondary}
        textSecondaryColor={colors.textSecondary}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* サブスクリプションタブの内容 */}
        {selectedTab === 'subscription' && (
          <>
            <View style={styles.packagesContainer}>
              {/* Pro プラン */}
              <PlanCard
                plan={SUBSCRIPTION_PLANS.pro}
                product={subscriptionProducts.find((p) => p.id === PRODUCT_IDS.PRO_MONTHLY)}
                isCurrentPlan={tier === 'pro'}
                purchasing={purchasing}
                onPurchase={handleSubscriptionPurchase}
              />

              {/* Premium プラン */}
              <PlanCard
                plan={SUBSCRIPTION_PLANS.premium}
                product={subscriptionProducts.find((p) => p.id === PRODUCT_IDS.PREMIUM_MONTHLY)}
                isCurrentPlan={tier === 'premium'}
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
            {/* トークン残高表示 */}
            <BalanceDisplay
              flashBalance={settings.tokenBalance.flash}
              proBalance={settings.tokenBalance.pro}
            />

            {/* Flash トークンパッケージ */}
            {availablePackages.filter(pkg => pkg.tokens.flash > 0).length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Flash トークン</Text>
                <Text style={styles.hint}>低コストモデル用（gemini-flash など）</Text>
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
              </>
            )}

            {/* Pro トークンパッケージ */}
            {availablePackages.filter(pkg => pkg.tokens.pro > 0).length > 0 && (
              <>
                <Text style={[styles.sectionTitle, styles.sectionTitleMargin]}>Pro トークン</Text>
                <Text style={styles.hint}>高性能モデル用（gemini-pro など）</Text>
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
              </>
            )}

            {/* 注意事項 */}
            <NoticeCard
              title="ご注意"
              text="• トークンは購入後すぐに残高に追加されます&#10;• 購入したトークンに有効期限はありません&#10;• トークンの返金はできません&#10;• Flash トークンは低コストのモデルで使用できます&#10;• Pro トークンは高性能モデルで使用できます"
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionTitleMargin: {
    marginTop: 24,
  },
  hint: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 12,
  },
});
