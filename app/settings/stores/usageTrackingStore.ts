/**
 * @file usageTrackingStore.ts
 * @summary 使用量トラッキングを管理するストア
 * @responsibility トークン使用量、LLMリクエスト数、ファイル数、ストレージ使用量の追跡
 */

import { create } from 'zustand';
import { UsageData, defaultUsageData } from '../types/usage.types';
import { SettingsPersistenceService } from '../services/settingsPersistenceService';

const STORAGE_KEY = 'usage_tracking';

interface UsageTrackingStore {
  usage: UsageData;
  isLoading: boolean;

  // 初期化
  loadUsage: () => Promise<void>;

  // 使用量トラッキング
  trackTokenUsage: (inputTokens: number, outputTokens: number, modelId: string) => Promise<void>;
  incrementLLMRequestCount: () => Promise<void>;
  incrementFileCount: () => Promise<void>;
  decrementFileCount: () => Promise<void>;
  updateStorageUsage: (sizeMB: number) => Promise<void>;

  // 月次リセット
  resetMonthlyUsage: () => Promise<void>;
  checkAndResetMonthlyUsageIfNeeded: () => Promise<void>;

  // 認証状態変更ハンドラ
  handleAuthenticationChange: (userId: string | null) => Promise<void>;
}

export const useUsageTrackingStore = create<UsageTrackingStore>((set, get) => ({
  usage: defaultUsageData,
  isLoading: false,

  loadUsage: async () => {
    set({ isLoading: true });
    try {
      const usage = await SettingsPersistenceService.load(STORAGE_KEY, defaultUsageData);
      set({ usage });
    } catch (error) {
      console.error('[UsageTrackingStore] Failed to load usage:', error);
      set({ usage: defaultUsageData });
    } finally {
      set({ isLoading: false });
    }
  },

  trackTokenUsage: async (inputTokens: number, outputTokens: number, modelId: string) => {
    const { usage } = get();

    // モデル別の使用量を更新
    const currentModelUsage = usage.monthlyTokensByModel[modelId] || {
      inputTokens: 0,
      outputTokens: 0,
    };

    const updatedTokensByModel = {
      ...usage.monthlyTokensByModel,
      [modelId]: {
        inputTokens: currentModelUsage.inputTokens + inputTokens,
        outputTokens: currentModelUsage.outputTokens + outputTokens,
      },
    };

    const newUsage: UsageData = {
      ...usage,
      monthlyInputTokens: usage.monthlyInputTokens + inputTokens,
      monthlyOutputTokens: usage.monthlyOutputTokens + outputTokens,
      monthlyTokensByModel: updatedTokensByModel,
      lastSyncedAt: new Date().toISOString(),
    };

    await SettingsPersistenceService.save(STORAGE_KEY, newUsage);
    set({ usage: newUsage });
    console.log(`[UsageTrackingStore] Tokens recorded for model ${modelId}: input=${inputTokens}, output=${outputTokens}`);
  },

  incrementLLMRequestCount: async () => {
    const { usage } = get();
    const newUsage: UsageData = {
      ...usage,
      monthlyLLMRequests: usage.monthlyLLMRequests + 1,
      lastSyncedAt: new Date().toISOString(),
    };

    await SettingsPersistenceService.save(STORAGE_KEY, newUsage);
    set({ usage: newUsage });
  },

  incrementFileCount: async () => {
    const { usage } = get();
    const newUsage: UsageData = {
      ...usage,
      currentFileCount: usage.currentFileCount + 1,
    };

    await SettingsPersistenceService.save(STORAGE_KEY, newUsage);
    set({ usage: newUsage });
  },

  decrementFileCount: async () => {
    const { usage } = get();
    const newUsage: UsageData = {
      ...usage,
      currentFileCount: Math.max(0, usage.currentFileCount - 1),
    };

    await SettingsPersistenceService.save(STORAGE_KEY, newUsage);
    set({ usage: newUsage });
  },

  updateStorageUsage: async (sizeMB: number) => {
    const { usage } = get();
    const newUsage: UsageData = {
      ...usage,
      storageUsedMB: sizeMB,
    };

    await SettingsPersistenceService.save(STORAGE_KEY, newUsage);
    set({ usage: newUsage });
  },

  resetMonthlyUsage: async () => {
    const { usage } = get();
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM形式
    const newUsage: UsageData = {
      ...usage,
      monthlyInputTokens: 0,
      monthlyOutputTokens: 0,
      monthlyTokensByModel: {},
      monthlyLLMRequests: 0,
      lastResetMonth: currentMonth,
    };

    await SettingsPersistenceService.save(STORAGE_KEY, newUsage);
    set({ usage: newUsage });
    console.log(`[UsageTrackingStore] Monthly usage reset for ${currentMonth}`);
  },

  checkAndResetMonthlyUsageIfNeeded: async () => {
    const { usage, resetMonthlyUsage } = get();
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM形式
    const lastResetMonth = usage.lastResetMonth;

    // 初回起動または月が変わった場合
    if (!lastResetMonth || lastResetMonth !== currentMonth) {
      console.log(`[UsageTrackingStore] Month changed: ${lastResetMonth} → ${currentMonth}`);
      await resetMonthlyUsage();
    }
  },

  handleAuthenticationChange: async (userId: string | null) => {
    if (userId) {
      // ログイン時: 使用量はそのまま保持（ユーザー切り替え時も継続）
      console.log('[UsageTrackingStore] User logged in, keeping usage data');
    } else {
      // ログアウト時: 使用量をクリア
      console.log('[UsageTrackingStore] User logged out, clearing usage data');
      try {
        const resetUsage: UsageData = defaultUsageData;
        await SettingsPersistenceService.save(STORAGE_KEY, resetUsage);
        set({ usage: resetUsage });
        console.log('[UsageTrackingStore] Usage data cleared');
      } catch (error) {
        console.error('[UsageTrackingStore] Failed to clear usage data:', error);
      }
    }
  },
}));
