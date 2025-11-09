/**
 * @file TokenPurchaseScreen.tsx
 * @summary トークン購入 & サブスクリプション管理画面
 * @description サブスクリプション購入とトークンパッケージ購入を統合した画面。
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Product, Purchase } from 'react-native-iap';
import { Ionicons } from '@expo/vector-icons';

import { useSettingsStore } from '../../settings/settingsStore';
import type { PurchaseRecord } from '../../settings/settingsStore';
import { useTheme } from '../../design/theme/ThemeContext';
import { useSubscription } from '../../utils/subscriptionHelpers';
import { PlanCard } from './components/PlanCard';
import {
  initializeIAP,
  getAvailableTokenPackages,
  purchaseTokenPackage,
  purchaseSubscription,
  restorePurchases,
  getTierFromProductId,
  getSubscriptionExpiry,
  PRODUCT_IDS,
} from '../../data/services/iapService';
import {
  TOKEN_PACKAGES,
  formatTokenAmount,
} from '../../constants/tokenPackages';
import type { TokenPackage } from '../../constants/tokenPackages';
import {
  SUBSCRIPTION_PLANS,
  SubscriptionTier,
} from '../../constants/plans';

type TabType = 'subscription' | 'tokens';

export default function TokenPurchaseScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { settings, addTokens, updateSettings } = useSettingsStore();
  const { tier } = useSubscription();

  // タブ選択
  const [selectedTab, setSelectedTab] = useState<TabType>('subscription');

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // トークンパッケージ関連
  const [tokenProducts, setTokenProducts] = useState<Product[]>([]);
  const [availablePackages, setAvailablePackages] = useState<TokenPackage[]>([]);

  // サブスクリプション関連
  const [subscriptionProducts, setSubscriptionProducts] = useState<Product[]>([]);
  const [selectedSubscriptionTab, setSelectedSubscriptionTab] = useState<'pro' | 'premium'>('pro');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      await initializeIAP();

      // トークンパッケージの読み込み
      const loadedProducts = await getAvailableTokenPackages();
      console.log('[TokenPurchaseScreen] Loaded token products from IAP:', loadedProducts);

      if (loadedProducts.length === 0) {
        console.warn('[TokenPurchaseScreen] No token products found from IAP');

        // 開発モード: モックデータを使用してUIを確認
        if (__DEV__) {
          console.log('[TokenPurchaseScreen] DEV MODE: Using all packages for UI testing');
          // 開発モードでは全パッケージを表示（UIテスト用）
          setAvailablePackages(TOKEN_PACKAGES);
        }
      } else {
        // IAPから取得できた商品に対応するパッケージのみをフィルタリング
        const productIds = loadedProducts.map((p) => (p as any).id); // v14では id を使用
        const matchedPackages = TOKEN_PACKAGES.filter((pkg) =>
          productIds.includes(pkg.productId)
        );

        console.log('[TokenPurchaseScreen] Product IDs from IAP:', productIds);
        console.log('[TokenPurchaseScreen] Matched packages:', matchedPackages);

        setAvailablePackages(matchedPackages);
      }

      setTokenProducts(loadedProducts);

      // サブスクリプション商品の読み込み
      const { getAvailableSubscriptions } = await import('../../data/services/iapService');
      const subProducts = await getAvailableSubscriptions();
      console.log('[TokenPurchaseScreen] Loaded subscription products:', subProducts);

      if (subProducts.length === 0) {
        console.warn('[TokenPurchaseScreen] No subscription products found');
      }

      setSubscriptionProducts(subProducts);
    } catch (error) {
      console.error('[TokenPurchaseScreen] Failed to load products:', error);
      Alert.alert('エラー', '商品情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
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
        (purchase: Purchase) => {
          handleSubscriptionPurchaseSuccess(purchase);
        },
        (error) => {
          const errorCode = String(error.code).toLowerCase();
          if (
            errorCode === 'e_user_cancelled' ||
            errorCode === 'user_cancelled' ||
            errorCode === 'user-cancelled'
          ) {
            console.log('[TokenPurchaseScreen] User cancelled subscription purchase');
            return;
          }

          console.error('[TokenPurchaseScreen] Subscription purchase error:', error);
          Alert.alert('購入エラー', '購入処理に失敗しました。');
        },
      );
    } catch (error) {
      console.error('[TokenPurchaseScreen] Subscription purchase failed:', error);
      Alert.alert('エラー', '購入リクエストに失敗しました。');
    } finally {
      setPurchasing(false);
    }
  };

  // サブスクリプション購入成功時の処理
  const handleSubscriptionPurchaseSuccess = (purchase: Purchase) => {
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

      const latestPurchase = purchases[0];
      handleSubscriptionPurchaseSuccess(latestPurchase as any);
    } catch (error) {
      console.error('[TokenPurchaseScreen] Restore failed:', error);
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

  // トークンパッケージ購入処理
  const handleTokenPurchase = async (pkg: TokenPackage) => {
    // 開発モード: モック購入
    if (__DEV__ && tokenProducts.length === 0) {
      console.log('[TokenPurchaseScreen] DEV MODE: Mock purchase for package:', pkg.id);
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
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } catch (error) {
                console.error('[TokenPurchaseScreen] Mock purchase error:', error);
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
    const product = tokenProducts.find((p) => (p as any).id === pkg.productId); // v14では id を使用
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
          console.log('[TokenPurchaseScreen] Purchase successful:', purchase);

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
                onPress: () => navigation.goBack(),
              },
            ]
          );
        },
        // onError
        (error) => {
          console.error('[TokenPurchaseScreen] Purchase failed:', error);
          setPurchasing(false);

          const errorCode = String(error.code).toLowerCase();
          if (
            errorCode === 'e_user_cancelled' ||
            errorCode === 'user_cancelled' ||
            errorCode === 'user-cancelled'
          ) {
            // ユーザーがキャンセルした場合は何もしない
            return;
          }

          Alert.alert('購入エラー', '購入処理中にエラーが発生しました');
        }
      );
    } catch (error) {
      console.error('[TokenPurchaseScreen] Unexpected error:', error);
      setPurchasing(false);
      Alert.alert('エラー', '予期しないエラーが発生しました');
    }
  };

  const renderPackageCard = (pkg: TokenPackage) => {
    const product = tokenProducts.find((p) => (p as any).id === pkg.productId); // v14では id を使用

    // Flash or Pro トークンの表示を決定
    const tokenDisplay = pkg.tokens.flash > 0
      ? `${formatTokenAmount(pkg.tokens.flash)} Flash トークン`
      : `${formatTokenAmount(pkg.tokens.pro)} Pro トークン`;

    return (
      <View key={pkg.id} style={styles.packageCard}>
        {pkg.badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pkg.badge}</Text>
          </View>
        )}
        <Text style={styles.packageName}>{pkg.name}</Text>
        <Text style={styles.packageDescription}>{pkg.description}</Text>
        <Text style={styles.packageTokens}>
          {tokenDisplay}
        </Text>
        <Text style={styles.packagePrice}>
          {product ? (product as any).localizedPrice || `¥${pkg.price}` : `¥${pkg.price}`}
        </Text>
        <TouchableOpacity
          style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
          onPress={() => handleTokenPurchase(pkg)}
          disabled={purchasing}
        >
          <Text style={styles.purchaseButtonText}>
            {purchasing ? '購入中...' : '購入する'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // サブスクリプションプラン（ProとPremiumのみ）
  const plans = [
    { plan: SUBSCRIPTION_PLANS.pro, isCurrentPlan: tier === 'pro', isRecommended: false },
    { plan: SUBSCRIPTION_PLANS.premium, isCurrentPlan: tier === 'premium', isRecommended: false },
  ];

  const currentPlan = plans.find(p => p.plan.id === selectedSubscriptionTab) || plans[0];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.textSecondary }}>読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* タブ切り替え */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'subscription' && [styles.activeTab, { backgroundColor: colors.primary }],
            selectedTab !== 'subscription' && { backgroundColor: colors.secondary },
          ]}
          onPress={() => setSelectedTab('subscription')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'subscription' && { color: '#FFFFFF' },
              selectedTab !== 'subscription' && { color: colors.textSecondary },
            ]}
          >
            サブスクリプション
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'tokens' && [styles.activeTab, { backgroundColor: colors.primary }],
            selectedTab !== 'tokens' && { backgroundColor: colors.secondary },
          ]}
          onPress={() => setSelectedTab('tokens')}
        >
          <Text
            style={[
              styles.tabText,
              selectedTab === 'tokens' && { color: '#FFFFFF' },
              selectedTab !== 'tokens' && { color: colors.textSecondary },
            ]}
          >
            トークンパッケージ
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* サブスクリプションタブの内容 */}
        {selectedTab === 'subscription' && (
          <>
            {/* ヘッダー */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>
                プランを選択
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                あなたに最適なプランをお選びください
              </Text>
            </View>

            {/* プランカード */}
            <View style={styles.planContainer}>
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
                {/* 基準カード（高さ計算用） */}
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
                      item.plan.id !== selectedSubscriptionTab && styles.hiddenCard,
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
              <View style={styles.subscriptionTabContainer}>
                <TouchableOpacity
                  style={[
                    styles.subscriptionTabButton,
                    selectedSubscriptionTab === 'pro' && { backgroundColor: colors.primary },
                    selectedSubscriptionTab !== 'pro' && { backgroundColor: colors.border },
                  ]}
                  onPress={() => setSelectedSubscriptionTab('pro')}
                >
                  <Text
                    style={[
                      styles.subscriptionTabButtonText,
                      selectedSubscriptionTab === 'pro' && { color: '#FFFFFF' },
                      selectedSubscriptionTab !== 'pro' && { color: colors.textSecondary },
                    ]}
                  >
                    Pro
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.subscriptionTabButton,
                    selectedSubscriptionTab === 'premium' && { backgroundColor: colors.primary },
                    selectedSubscriptionTab !== 'premium' && { backgroundColor: colors.border },
                  ]}
                  onPress={() => setSelectedSubscriptionTab('premium')}
                >
                  <Text
                    style={[
                      styles.subscriptionTabButtonText,
                      selectedSubscriptionTab === 'premium' && { color: '#FFFFFF' },
                      selectedSubscriptionTab !== 'premium' && { color: colors.textSecondary },
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
                    styles.subscriptionPurchaseButton,
                    { backgroundColor: colors.primary },
                    purchasing && styles.purchaseButtonDisabled,
                  ]}
                  onPress={() => handleSubscriptionPurchase(currentPlan.plan.id)}
                  disabled={purchasing}
                >
                  {purchasing ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.subscriptionPurchaseButtonText, { color: '#FFFFFF' }]}>
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
                  <Ionicons name="checkmark-circle" size={24} color={colors.success || '#28a745'} />
                  <Text style={[styles.currentPlanText, { color: colors.text }]}>
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
                  <Text style={[styles.restoreText, { color: colors.primary }]}>
                    購入を復元
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* 注意事項 */}
            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>注意事項:</Text>
              <Text style={styles.noteText}>
                • サブスクリプションは自動更新されます{'\n'}
                • キャンセル後も期限まで利用できます{'\n'}
                • 返金はApple/Googleのポリシーに準じます
              </Text>
            </View>
          </>
        )}

        {/* トークンパッケージタブの内容 */}
        {selectedTab === 'tokens' && (
          <>
            {/* トークン残高表示 */}
            <View style={styles.balanceCard}>
              <Text style={styles.balanceTitle}>現在のトークン残高</Text>
              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Text style={styles.balanceLabel}>Flash トークン</Text>
                  <Text style={styles.balanceValue}>
                    {formatTokenAmount(settings.tokenBalance.flash)}
                  </Text>
                </View>
                {settings.tokenBalance.pro > 0 && (
                  <View style={styles.balanceItem}>
                    <Text style={styles.balanceLabel}>Pro トークン</Text>
                    <Text style={styles.balanceValue}>
                      {formatTokenAmount(settings.tokenBalance.pro)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* パッケージリスト */}
            {/* Flash トークンパッケージ */}
            {availablePackages.filter(pkg => pkg.tokens.flash > 0).length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Flash トークン</Text>
                <Text style={[styles.hint, { marginBottom: 12 }]}>低コストモデル用（gemini-flash など）</Text>
                <View style={styles.packagesContainer}>
                  {availablePackages
                    .filter(pkg => pkg.tokens.flash > 0)
                    .map((pkg) => renderPackageCard(pkg))}
                </View>
              </>
            )}

            {/* Pro トークンパッケージ */}
            {availablePackages.filter(pkg => pkg.tokens.pro > 0).length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Pro トークン</Text>
                <Text style={[styles.hint, { marginBottom: 12 }]}>高性能モデル用（gemini-pro など）</Text>
                <View style={styles.packagesContainer}>
                  {availablePackages
                    .filter(pkg => pkg.tokens.pro > 0)
                    .map((pkg) => renderPackageCard(pkg))}
                </View>
              </>
            )}

            {/* 注意事項 */}
            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>ご注意</Text>
              <Text style={styles.noteText}>
                • トークンは購入後すぐに残高に追加されます{'\n'}
                • 購入したトークンに有効期限はありません{'\n'}
                • トークンの返金はできません{'\n'}
                • Flash トークンは低コストのモデルで使用できます{'\n'}
                • Pro トークンは高性能モデルで使用できます
              </Text>
            </View>
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
  // タブUI
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTab: {},
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // サブスクリプション関連
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
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
  subscriptionTabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  subscriptionTabButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  subscriptionTabButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionPurchaseButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
  },
  subscriptionPurchaseButtonText: {
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 16,
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
    fontSize: 16,
  },
  // トークンパッケージ関連
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  balanceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  hint: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  loader: {
    marginTop: 40,
  },
  packagesContainer: {
    gap: 16,
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  packageName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  packageDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  packageTokens: {
    fontSize: 18,
    fontWeight: '500',
    color: '#007AFF',
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  purchaseButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    backgroundColor: '#CCC',
  },
  purchaseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  noteCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
