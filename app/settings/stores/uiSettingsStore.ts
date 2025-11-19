/**
 * @file uiSettingsStore.ts
 * @summary UI/表示設定を管理するストア
 * @responsibility テーマ、フォント、表示オプション、ファイルリスト表示設定の管理
 */

import { create } from 'zustand';
import { UISettings, defaultUISettings } from '../types/uiSettings.types';
import { SettingsPersistenceService } from '../services/settingsPersistenceService';

const STORAGE_KEY = 'ui';

interface UISettingsStore {
  settings: UISettings;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<UISettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useUISettingsStore = create<UISettingsStore>((set, get) => ({
  settings: defaultUISettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await SettingsPersistenceService.load(
        STORAGE_KEY,
        defaultUISettings
      );
      set({ settings });
    } catch (error) {
      console.error('[UISettingsStore] Failed to load settings:', error);
      set({ settings: defaultUISettings });
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates: Partial<UISettings>) => {
    const newSettings = { ...get().settings, ...updates };

    try {
      await SettingsPersistenceService.save(STORAGE_KEY, newSettings);
      set({ settings: newSettings });
      console.log('[UISettingsStore] Settings updated:', updates);
    } catch (error) {
      console.error('[UISettingsStore] Failed to update settings:', error);
      throw error;
    }
  },

  resetSettings: async () => {
    try {
      await SettingsPersistenceService.save(STORAGE_KEY, defaultUISettings);
      set({ settings: defaultUISettings });
      console.log('[UISettingsStore] Settings reset to defaults');
    } catch (error) {
      console.error('[UISettingsStore] Failed to reset settings:', error);
      throw error;
    }
  },
}));
