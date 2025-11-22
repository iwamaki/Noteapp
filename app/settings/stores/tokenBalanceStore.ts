/**
 * @file tokenBalanceStore.ts
 * @summary トークン残高とモデル装填を管理するストア
 * @responsibility トークン残高、クレジット、モデル装填、購入履歴の管理
 */

import { create } from 'zustand';
import {
  TokenBalance,
  LoadedModels,
  PurchaseRecord,
  defaultTokenBalance,
  defaultLoadedModels,
} from '../types/tokenBalance.types';
import { SettingsPersistenceService } from '../services/settingsPersistenceService';
import { logger } from '../../utils/logger';

const STORAGE_KEY_BALANCE = 'token_balance';
const STORAGE_KEY_MODELS = 'loaded_models';
const STORAGE_KEY_PURCHASES = 'purchase_history';

interface TokenBalanceStore {
  balance: TokenBalance;
  loadedModels: LoadedModels;
  purchaseHistory: PurchaseRecord[];
  activeModelCategory: 'quick' | 'think';
  shouldShowAllocationModal: boolean;
  isLoading: boolean;

  // 初期化
  loadData: () => Promise<void>;

  // トークン残高管理（API経由）
  loadTokenBalance: () => Promise<void>;
  refreshTokenBalance: () => Promise<void>;
  getTotalTokensByCategory: (category: 'quick' | 'think') => number;

  // モデル装填管理
  loadModel: (category: 'quick' | 'think', modelId: string) => Promise<void>;
  setActiveModelCategory: (category: 'quick' | 'think') => void;

  // 購入履歴管理
  getPurchaseHistory: () => PurchaseRecord[];

  // UI状態管理
  setShouldShowAllocationModal: (should: boolean) => void;

  // デバッグ用
  resetTokensAndUsage: () => Promise<void>;

  // 認証状態変更ハンドラ
  handleAuthenticationChange: (userId: string | null) => Promise<void>;
}

export const useTokenBalanceStore = create<TokenBalanceStore>((set, get) => ({
  balance: defaultTokenBalance,
  loadedModels: defaultLoadedModels,
  purchaseHistory: [],
  activeModelCategory: 'quick',
  shouldShowAllocationModal: false,
  isLoading: false,

  loadData: async () => {
    set({ isLoading: true });
    try {
      const [balance, loadedModels, purchaseHistory] = await Promise.all([
        SettingsPersistenceService.load(STORAGE_KEY_BALANCE, defaultTokenBalance),
        SettingsPersistenceService.load(STORAGE_KEY_MODELS, defaultLoadedModels),
        SettingsPersistenceService.load(STORAGE_KEY_PURCHASES, [] as PurchaseRecord[]),
      ]);

      set({ balance, loadedModels, purchaseHistory });
    } catch (error) {
      logger.error('billing', 'Failed to load data', error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadTokenBalance: async () => {
    try {
      // BillingApiServiceをインポート（遅延インポートで循環依存を回避）
      const { getBillingApiService, isBillingApiServiceInitialized } = await import(
        '../../billing/services/billingApiService'
      );

      // 初期化されていない場合はスキップ
      if (!isBillingApiServiceInitialized()) {
        logger.warn('billing', 'BillingApiService not initialized, skipping balance load');
        return;
      }

      // 認証トークンの確認
      const { getAccessToken } = await import('../../auth/tokenService');
      const accessToken = await getAccessToken();

      if (!accessToken) {
        logger.warn('billing', 'No access token found, skipping balance load');
        return;
      }

      const billingService = getBillingApiService();
      const apiBalance = await billingService.getBalance();

      const balance: TokenBalance = {
        credits: apiBalance.credits || 0,
        allocatedTokens: apiBalance.allocatedTokens || {},
      };

      await SettingsPersistenceService.save(STORAGE_KEY_BALANCE, balance);
      set({ balance });
      logger.info('billing', 'Token balance loaded from API', {
        credits: balance.credits,
        models: Object.keys(balance.allocatedTokens).length,
      });
    } catch (error) {
      logger.error('billing', 'Failed to load token balance', error);
    }
  },

  refreshTokenBalance: async () => {
    await get().loadTokenBalance();
  },

  getTotalTokensByCategory: (category: 'quick' | 'think') => {
    const { balance } = get();
    const { allocatedTokens } = balance;

    // Zustandストアから取得
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useLLMStore } = require('../../features/llmService/stores/useLLMStore');
    const llmStore = useLLMStore.getState();

    let total = 0;
    for (const [modelId, tokenBalance] of Object.entries(allocatedTokens)) {
      if (llmStore.getModelCategory(modelId) === category) {
        total += tokenBalance;
      }
    }
    return total;
  },

  loadModel: async (category: 'quick' | 'think', modelId: string) => {
    const { loadedModels } = get();
    const newLoadedModels = {
      ...loadedModels,
      [category]: modelId,
    };

    await SettingsPersistenceService.save(STORAGE_KEY_MODELS, newLoadedModels);
    set({
      loadedModels: newLoadedModels,
      activeModelCategory: category,
    });
    logger.info('billing', `Loaded ${modelId} into ${category} slot, set active category to ${category}`);
  },

  setActiveModelCategory: (category: 'quick' | 'think') => {
    set({ activeModelCategory: category });
  },

  getPurchaseHistory: () => {
    return get().purchaseHistory;
  },

  setShouldShowAllocationModal: (should: boolean) => {
    set({ shouldShowAllocationModal: should });
  },

  resetTokensAndUsage: async () => {
    try {
      // バックエンドDBをリセット
      const { getBillingApiService } = await import('../../billing/services/billingApiService');
      const billingService = getBillingApiService();
      await billingService.resetAllData();

      // ローカルキャッシュをリセット
      const resetBalance = defaultTokenBalance;
      const resetPurchases: PurchaseRecord[] = [];

      await Promise.all([
        SettingsPersistenceService.save(STORAGE_KEY_BALANCE, resetBalance),
        SettingsPersistenceService.save(STORAGE_KEY_PURCHASES, resetPurchases),
      ]);

      set({
        balance: resetBalance,
        purchaseHistory: resetPurchases,
      });

      logger.info('billing', 'Token balance and purchases reset');
    } catch (error) {
      logger.error('billing', 'Failed to reset tokens', error);
      throw error;
    }
  },

  handleAuthenticationChange: async (userId: string | null) => {
    if (userId) {
      // ログイン時: 新しいアカウントのトークン残高を取得
      logger.info('billing', 'User logged in, refreshing token balance');
      try {
        await get().loadTokenBalance();
        logger.info('billing', 'Token balance loaded for user', { userId: userId.substring(0, 8) });
      } catch (error) {
        logger.warn('billing', 'Failed to load token balance after login', error);
      }
    } else {
      // ログアウト時: トークン残高、購入履歴をクリア
      logger.info('billing', 'User logged out, clearing token balance');
      try {
        const resetBalance = defaultTokenBalance;
        const resetPurchases: PurchaseRecord[] = [];

        await Promise.all([
          SettingsPersistenceService.save(STORAGE_KEY_BALANCE, resetBalance),
          SettingsPersistenceService.save(STORAGE_KEY_PURCHASES, resetPurchases),
        ]);

        set({
          balance: resetBalance,
          purchaseHistory: resetPurchases,
        });

        logger.info('billing', 'Token balance and purchases cleared');
      } catch (error) {
        logger.error('billing', 'Failed to clear token balance', error);
      }
    }
  },
}));
