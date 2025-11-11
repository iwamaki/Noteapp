/**
 * @file BillingModal.tsx
 * @summary トークン購入用のモーダル
 * @description Quick/Thinkトークンのパッケージ購入をシンプルに行うモーダル
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CustomModal } from '../../components/CustomModal';
import { PurchaseConfirmModal } from '../../components/PurchaseConfirmModal';
import type { PurchaseDetail } from '../../components/PurchaseConfirmModal';
import { useTheme } from '../../design/theme/ThemeContext';
import { useSettingsStore } from '../../settings/settingsStore';
import { getAvailablePackages, formatTokenAmount, TokenPackage } from '../constants/tokenPackages';
import { initializeTokenIAP, getAvailableTokenPackages, purchaseTokenPackage } from '../services/tokenIapService';
import { isUserCancelledError } from '../utils/purchaseHelpers';
import type { Product, Purchase } from 'react-native-iap';
import type { PurchaseRecord } from '../../settings/settingsStore';
import { Alert } from 'react-native';

type TokenType = 'flash' | 'pro';

interface BillingModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const BillingModal: React.FC<BillingModalProps> = ({
  isVisible,
  onClose,
}) => {
  const { colors, typography, spacing } = useTheme();
  const { settings, addCredits, setShouldShowAllocationModal } = useSettingsStore();
  const [selectedTab, setSelectedTab] = useState<TokenType>('flash');
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [tokenProducts, setTokenProducts] = useState<Product[]>([]);
  const [availablePackages, setAvailablePackages] = useState<TokenPackage[]>([]);

  // 購入確認モーダル用のステート
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // モーダルが開いたときに初期化
  useEffect(() => {
    if (isVisible) {
      loadProducts();
    }
  }, [isVisible]);

  // 商品情報を読み込む
  const loadProducts = async () => {
    setLoading(true);
    try {
      await initializeTokenIAP();
      const products = await getAvailableTokenPackages();
      setTokenProducts(products);

      // 購入履歴に基づいて利用可能なパッケージを取得
      const packages = getAvailablePackages(settings.purchaseHistory);
      setAvailablePackages(packages);
    } catch (error) {
      console.error('[BillingModal] Failed to load products:', error);
      Alert.alert('エラー', '商品情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // クレジットシステムではタブ不要（全パッケージ表示）
  const filteredPackages = availablePackages;

  // パッケージカードをタップしたときに確認モーダルを表示
  const handlePackagePress = (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
    setShowConfirmModal(true);
  };

  // 確認モーダルを閉じる
  const handleCancelPurchase = () => {
    setShowConfirmModal(false);
    setSelectedPackage(null);
  };

  // 確認モーダルから購入を確定
  const handleConfirmPurchase = async () => {
    if (selectedPackage) {
      setShowConfirmModal(false);
      await executePurchase(selectedPackage);
      setSelectedPackage(null);
    }
  };

  // モーダルに表示する購入詳細
  const purchaseDetails: PurchaseDetail[] = useMemo(() => {
    if (!selectedPackage) return [];

    const product = tokenProducts.find((p) => (p as any).id === selectedPackage.productId);
    const priceDisplay = product
      ? (product as any).localizedPrice || `¥${selectedPackage.price}`
      : `¥${selectedPackage.price}`;

    return [
      {
        label: 'クレジット:',
        value: `${selectedPackage.credits}円分`,
        isPrimary: false,
      },
      {
        label: '価格:',
        value: priceDisplay,
        isPrimary: true,
      },
    ];
  }, [selectedPackage, tokenProducts]);

  // 実際の購入処理を実行
  const executePurchase = async (pkg: TokenPackage) => {
    // 開発モード: モック購入
    if (__DEV__ && tokenProducts.length === 0) {
      Alert.alert(
        '開発モード - モック購入',
        `${pkg.name}（${pkg.price}円）の購入をシミュレートしますか？\n\n実際の課金は発生しません。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          {
            text: '購入',
            onPress: async () => {
              setPurchasing(true);
              try {
                const mockPurchaseRecord: PurchaseRecord = {
                  id: `mock_${Date.now()}`,
                  type: pkg.isInitial ? 'initial' : 'addon',
                  productId: pkg.productId,
                  transactionId: `mock_transaction_${Date.now()}`,
                  purchaseDate: new Date().toISOString(),
                  amount: pkg.price,
                  creditsAdded: pkg.credits,
                };

                await addCredits(pkg.credits, mockPurchaseRecord);

                Alert.alert(
                  '💰 購入完了（開発モード）',
                  `${pkg.credits}円分のクレジットを追加しました\n\nモデルに配分しますか？\n（後から設定画面で配分できます）`,
                  [
                    { text: '後で配分する', onPress: onClose },
                    {
                      text: '今すぐ配分する',
                      onPress: () => {
                        setShouldShowAllocationModal(true);
                        onClose();
                      }
                    },
                  ]
                );
              } catch (error) {
                console.error('[BillingModal] Mock purchase error:', error);
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
          console.log('[BillingModal] Purchase successful:', purchase);

          const purchaseRecord: PurchaseRecord = {
            id: purchase.transactionId || `${Date.now()}`,
            type: pkg.isInitial ? 'initial' : 'addon',
            productId: pkg.productId,
            transactionId: purchase.transactionId || '',
            purchaseDate: new Date(purchase.transactionDate).toISOString(),
            amount: pkg.price,
            creditsAdded: pkg.credits,
          };

          await addCredits(pkg.credits, purchaseRecord);

          setPurchasing(false);

          Alert.alert(
            '💰 購入完了',
            `${pkg.credits}円分のクレジットを追加しました\n\nモデルに配分しますか？\n（後から設定画面で配分できます）`,
            [
              { text: '後で配分する', onPress: onClose },
              {
                text: '今すぐ配分する',
                onPress: () => {
                  setShouldShowAllocationModal(true);
                  onClose();
                }
              },
            ]
          );
        },
        // onError
        (error) => {
          console.error('[BillingModal] Purchase failed:', error);
          setPurchasing(false);

          if (isUserCancelledError(error)) {
            return;
          }

          Alert.alert('購入エラー', '購入処理中にエラーが発生しました');
        }
      );
    } catch (error) {
      console.error('[BillingModal] Unexpected error:', error);
      setPurchasing(false);
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  const styles = StyleSheet.create({
    tabContainer: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    tab: {
      flex: 1,
      paddingVertical: spacing.sm,
      borderRadius: 8,
      alignItems: 'center',
      borderWidth: 2,
    },
    tabSelected: {
      backgroundColor: colors.secondary,
      borderColor: colors.primary,
    },
    tabUnselected: {
      backgroundColor: colors.secondary,
      borderColor: 'transparent',
    },
    tabContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabText: {
      fontSize: typography.body.fontSize,
      fontWeight: '600',
    },
    tabTextSelected: {
      color: colors.text,
    },
    tabTextUnselected: {
      color: colors.textSecondary,
    },
    packageCard: {
      backgroundColor: colors.background,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    packageHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    packageName: {
      fontSize: typography.body.fontSize,
      fontWeight: 'bold',
      color: colors.text,
    },
    packagePrice: {
      fontSize: typography.body.fontSize,
      fontWeight: 'bold',
      color: colors.primary,
    },
    packageDescription: {
      fontSize: typography.caption.fontSize,
      color: colors.textSecondary,
    },
    badge: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.xs / 2,
      borderRadius: 4,
      marginLeft: spacing.sm,
    },
    badgeText: {
      color: colors.white,
      fontSize: typography.caption.fontSize,
      fontWeight: '600',
    },
    balanceContainer: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.secondary,
      borderRadius: 8,
      marginBottom: spacing.sm,
    },
    balanceText: {
      fontSize: typography.body.fontSize,
      color: colors.text,
      textAlign: 'center',
    },
    noticeContainer: {
      padding: spacing.sm,
      marginTop: spacing.sm,
    },
    noticeText: {
      fontSize: typography.caption.fontSize,
      color: colors.textSecondary,
    },
    loadingContainer: {
      padding: spacing.xl,
      alignItems: 'center',
    },
    emptyText: {
      textAlign: 'center',
      color: colors.textSecondary,
      fontSize: typography.body.fontSize,
      paddingVertical: spacing.lg,
    },
  });

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    return (
      <>
        {/* タブ選択 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'flash' ? styles.tabSelected : styles.tabUnselected,
            ]}
            onPress={() => setSelectedTab('flash')}
          >
            <View style={styles.tabContent}>
              <MaterialCommunityIcons
                name="speedometer"
                size={20}
                color={selectedTab === 'flash' ? '#FFC107' : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabText,
                  selectedTab === 'flash' ? styles.tabTextSelected : styles.tabTextUnselected,
                ]}
              >
                Quick
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              selectedTab === 'pro' ? styles.tabSelected : styles.tabUnselected,
            ]}
            onPress={() => setSelectedTab('pro')}
          >
            <View style={styles.tabContent}>
              <MaterialCommunityIcons
                name="speedometer-slow"
                size={20}
                color={selectedTab === 'pro' ? '#4CAF50' : colors.textSecondary}
                style={{ marginRight: 6 }}
              />
              <Text
                style={[
                  styles.tabText,
                  selectedTab === 'pro' ? styles.tabTextSelected : styles.tabTextUnselected,
                ]}
              >
                Think
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 現在のクレジット残高 */}
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceText}>
            未配分クレジット: {settings.tokenBalance.credits}円
          </Text>
        </View>

        {/* パッケージリスト */}
        <ScrollView showsVerticalScrollIndicator={true}>
          {filteredPackages.length === 0 ? (
            <Text style={styles.emptyText}>購入可能なパッケージがありません</Text>
          ) : (
            filteredPackages.map((pkg) => (
              <TouchableOpacity
                key={pkg.id}
                style={styles.packageCard}
                onPress={() => handlePackagePress(pkg)}
                disabled={purchasing}
              >
                <View style={styles.packageHeader}>
                  <Text style={styles.packageName}>
                    {pkg.name}
                  </Text>
                  {pkg.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pkg.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.packagePrice}>¥{pkg.price}</Text>
                <Text style={styles.packageDescription}>{pkg.description}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        {/* 注意事項 */}
        <View style={styles.noticeContainer}>
          <Text style={styles.noticeText}>
            ℹ️ トークンは購入後すぐに残高に追加されます
          </Text>
        </View>
      </>
    );
  };

  return (
    <>
      <CustomModal
        isVisible={isVisible}
        title="💰 トークンパッケージ購入"
        buttons={[
          {
            text: 'キャンセル',
            style: 'cancel',
            onPress: onClose,
          },
        ]}
        onClose={onClose}
      >
        {renderContent()}
      </CustomModal>

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
    </>
  );
};
