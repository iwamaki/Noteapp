/**
 * @file TokenPurchaseScreen.tsx
 * @summary トークン購入画面
 * @description Phase 1 MVP のトークン購入機能を提供します。
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

import { useSettingsStore } from '../../settings/settingsStore';
import type { PurchaseRecord } from '../../settings/settingsStore';
import {
  initializeIAP,
  getAvailableTokenPackages,
  purchaseTokenPackage,
} from '../../data/services/iapService';
import {
  TOKEN_PACKAGES,
  formatTokenAmount,
  getPackageByProductId,
} from '../../constants/tokenPackages';
import type { TokenPackage } from '../../constants/tokenPackages';

export default function TokenPurchaseScreen() {
  const navigation = useNavigation();
  const { settings, addTokens } = useSettingsStore();

  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [availablePackages, setAvailablePackages] = useState<TokenPackage[]>([]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      await initializeIAP();
      const loadedProducts = await getAvailableTokenPackages();
      console.log('[TokenPurchaseScreen] Loaded products from IAP:', loadedProducts);

      if (loadedProducts.length === 0) {
        console.warn('[TokenPurchaseScreen] No products found from IAP');

        // 開発モード: モックデータを使用してUIを確認
        if (__DEV__) {
          console.log('[TokenPurchaseScreen] DEV MODE: Using all packages for UI testing');
          Alert.alert(
            '開発モード',
            'IAP商品が見つかりませんでした。開発用に全パッケージを表示します。\n\n本番環境では、Google Play Consoleに商品を登録してください。'
          );
          // 開発モードでは全パッケージを表示（UIテスト用）
          setAvailablePackages(TOKEN_PACKAGES);
        } else {
          Alert.alert('警告', 'トークンパッケージが見つかりませんでした。Play Consoleの設定を確認してください。');
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

      setProducts(loadedProducts);
    } catch (error) {
      console.error('[TokenPurchaseScreen] Failed to load products:', error);
      Alert.alert('エラー', 'トークンパッケージの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg: TokenPackage) => {
    // 開発モード: モック購入
    if (__DEV__ && products.length === 0) {
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
    const product = products.find((p) => (p as any).id === pkg.productId); // v14では id を使用
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
    const product = products.find((p) => (p as any).id === pkg.productId); // v14では id を使用

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
          onPress={() => handlePurchase(pkg)}
          disabled={purchasing}
        >
          <Text style={styles.purchaseButtonText}>
            {purchasing ? '購入中...' : '購入する'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : (
          <>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
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
