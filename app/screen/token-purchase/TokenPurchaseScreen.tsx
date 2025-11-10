/**
 * @file TokenPurchaseScreen.tsx
 * @summary トークン購入 & サブスクリプション管理画面
 * @description サブスクリプション購入とトークンパッケージ購入を統合した画面。
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';

import { useTheme } from '../../design/theme/ThemeContext';
import { MainContainer } from '../../components/MainContainer';

// Components
import { TokenPackageCard } from './components/TokenPackageCard';
import { NoticeCard } from './components/NoticeCard';

// Hooks
import { useProductLoader } from './hooks/useProductLoader';
import { usePurchaseHandlers } from './hooks/usePurchaseHandlers';
import { useTokenPurchaseHeader } from './hooks/useTokenPurchaseHeader';

export default function TokenPurchaseScreen() {
  const { colors } = useTheme();

  // ヘッダー設定
  useTokenPurchaseHeader();

  // 商品読み込み
  const {
    loading,
    tokenProducts,
    availablePackages,
  } = useProductLoader();

  // 購入処理
  const {
    purchasing,
    handleTokenPurchase,
  } = usePurchaseHandlers({
    subscriptionProducts: [],
    tokenProducts,
  });

  return (
    <MainContainer isLoading={loading}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
      </ScrollView>
    </MainContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  packagesContainer: {
    gap: 16,
  },
});
