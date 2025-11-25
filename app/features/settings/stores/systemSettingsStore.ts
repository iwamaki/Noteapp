/**
 * @file systemSettingsStore.ts
 * @summary システム/セキュリティ/その他設定を管理するストア
 * @responsibility セキュリティ、ストレージ、通知、開発者設定の管理
 */

import { create } from 'zustand';
import { SystemSettings, defaultSystemSettings } from '../types/systemSettings.types';
import { SettingsPersistenceService } from '../services/settingsPersistenceService';
import { logger } from '../../../utils/logger';

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
      logger.error('system', 'Failed to load system settings', { error });
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
      logger.info('system', 'System settings updated', { updates });
    } catch (error) {
      logger.error('system', 'Failed to update system settings', { error });
      throw error;
    }
  },

  resetSettings: async () => {
    try {
      await SettingsPersistenceService.save(STORAGE_KEY, defaultSystemSettings);
      set({ settings: defaultSystemSettings });
      logger.info('system', 'System settings reset to defaults');
    } catch (error) {
      logger.error('system', 'Failed to reset system settings', { error });
      throw error;
    }
  },
}));
