/**
 * @file useProductLoader.ts
 * @summary Custom hook for loading token packages
 * @description Handles loading and filtering of token packages from IAP
 */

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import type { Product } from 'react-native-iap';
import { initializeTokenIAP, getAvailableTokenPackages } from '../../../features/billing/services/tokenIapService';
import { TOKEN_PACKAGES } from '../../../features/billing/constants/tokenPackages';
import type { TokenPackage } from '../../../features/billing/constants/tokenPackages';
import { logger } from '../../../utils/logger';

interface UseProductLoaderReturn {
  loading: boolean;
  tokenProducts: Product[];
  availablePackages: TokenPackage[];
  reload: () => Promise<void>;
}

export const useProductLoader = (): UseProductLoaderReturn => {
  const [loading, setLoading] = useState(true);
  const [tokenProducts, setTokenProducts] = useState<Product[]>([]);
  const [availablePackages, setAvailablePackages] = useState<TokenPackage[]>([]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      await initializeTokenIAP();

      // トークンパッケージの読み込み
      const loadedProducts = await getAvailableTokenPackages();
      logger.info('billing', 'Loaded token products from IAP', { loadedProducts });

      if (loadedProducts.length === 0) {
        logger.warn('billing', 'No token products found from IAP');

        // 開発モード: モックデータを使用してUIを確認
        if (__DEV__) {
          logger.debug('billing', 'DEV MODE: Using all packages for UI testing');
          setAvailablePackages(TOKEN_PACKAGES);
        }
      } else {
        // IAPから取得できた商品に対応するパッケージのみをフィルタリング
        const productIds = loadedProducts.map((p) => (p as any).id);
        const matchedPackages = TOKEN_PACKAGES.filter((pkg) =>
          productIds.includes(pkg.productId)
        );

        logger.debug('billing', 'Product IDs from IAP', { productIds });
        logger.debug('billing', 'Matched packages', { matchedPackages });

        setAvailablePackages(matchedPackages);
      }

      setTokenProducts(loadedProducts);
    } catch (error) {
      logger.error('billing', 'Failed to load products', { error });
      Alert.alert('エラー', '商品情報の読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  return {
    loading,
    tokenProducts,
    availablePackages,
    reload: loadProducts,
  };
};
