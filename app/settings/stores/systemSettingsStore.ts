/**
 * @file systemSettingsStore.ts
 * @summary システム/セキュリティ/その他設定を管理するストア
 * @responsibility セキュリティ、ストレージ、通知、開発者設定の管理
 */

import { create } from 'zustand';
import { SystemSettings, defaultSystemSettings } from '../types/systemSettings.types';
import { SettingsPersistenceService } from '../services/settingsPersistenceService';

const STORAGE_KEY = 'system';

interface SystemSettingsStore {
  settings: SystemSettings;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<SystemSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSystemSettingsStore = create<SystemSettingsStore>((set, get) => ({
  settings: defaultSystemSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await SettingsPersistenceService.load(
        STORAGE_KEY,
        defaultSystemSettings
      );
      set({ settings });
    } catch (error) {
      console.error('[SystemSettingsStore] Failed to load settings:', error);
      set({ settings: defaultSystemSettings });
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates: Partial<SystemSettings>) => {
    const newSettings = { ...get().settings, ...updates };

    try {
      await SettingsPersistenceService.save(STORAGE_KEY, newSettings);
      set({ settings: newSettings });
      console.log('[SystemSettingsStore] Settings updated:', updates);
    } catch (error) {
      console.error('[SystemSettingsStore] Failed to update settings:', error);
      throw error;
    }
  },

  resetSettings: async () => {
    try {
      await SettingsPersistenceService.save(STORAGE_KEY, defaultSystemSettings);
      set({ settings: defaultSystemSettings });
      console.log('[SystemSettingsStore] Settings reset to defaults');
    } catch (error) {
      console.error('[SystemSettingsStore] Failed to reset settings:', error);
      throw error;
    }
  },
}));
