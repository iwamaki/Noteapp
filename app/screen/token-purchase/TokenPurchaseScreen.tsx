/**
 * @file TokenPurchaseScreen.tsx
 * @summary トークン購入 & サブスクリプション管理画面
 * @description サブスクリプション購入とトークンパッケージ購入を統合した画面。
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
} from 'react-native';

import { MainContainer } from '../../components/MainContainer';
import { PurchaseConfirmModal } from '../../components/PurchaseConfirmModal';
import type { PurchaseDetail } from '../../components/PurchaseConfirmModal';

// Components
import { TokenPackageCard } from './components/TokenPackageCard';
import { NoticeCard } from './components/NoticeCard';

// Hooks
import { useProductLoader } from './hooks/useProductLoader';
import { usePurchaseHandlers } from './hooks/usePurchaseHandlers';
import { useTokenPurchaseHeader } from './hooks/useTokenPurchaseHeader';

// Types
import type { TokenPackage } from '../../billing/constants/tokenPackages';
import { formatTokenAmount } from '../../billing/constants/tokenPackages';

export default function TokenPurchaseScreen() {
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
    tokenProducts,
  });

  // 購入確認モーダル
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleCardPress = (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
    setShowConfirmModal(true);
  };

  const handleConfirmPurchase = async () => {
    if (selectedPackage) {
      setShowConfirmModal(false);
      await handleTokenPurchase(selectedPackage);
      setSelectedPackage(null);
    }
  };

  const handleCancelPurchase = () => {
    setShowConfirmModal(false);
    setSelectedPackage(null);
  };

  // モーダルに表示する購入詳細
  const purchaseDetails: PurchaseDetail[] = useMemo(() => {
    if (!selectedPackage) return [];

    const product = tokenProducts.find((p) => (p as any).id === selectedPackage.productId);
    const priceDisplay = product ? (product as any).localizedPrice || `¥${selectedPackage.price}` : `¥${selectedPackage.price}`;

    return [
      {
        label: 'クレジット:',
        value: `${selectedPackage.credits}P`,
        isPrimary: false,
      },
      {
        label: '価格:',
        value: priceDisplay,
        isPrimary: true,
      },
    ];
  }, [selectedPackage, tokenProducts]);

  return (
    <MainContainer isLoading={loading}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* クレジットパッケージ */}
        <View style={styles.packagesContainer}>
          {availablePackages.map((pkg) => (
            <TokenPackageCard
              key={pkg.id}
              package={pkg}
              product={tokenProducts.find((p) => (p as any).id === pkg.productId)}
              onPress={handleCardPress}
            />
          ))}
        </View>

        {/* 注意事項 */}
        <NoticeCard
          title="ご注意"
          text="• クレジットは購入後すぐに残高に追加されます&#10;• 購入したクレジットに有効期限はありません&#10;• クレジットの返金はできません"
        />
      </ScrollView>

      {/* 購入確認モーダル */}
      {selectedPackage && (
        <PurchaseConfirmModal
          isVisible={showConfirmModal}
          onClose={handleCancelPurchase}
          onConfirm={handleConfirmPurchase}
          title="購入確認"
          message={`${selectedPackage.name}を購入しますか？`}
          details={purchaseDetails}
          purchasing={purchasing}
        />
      )}
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
    marginBottom: 16,
  },
});
