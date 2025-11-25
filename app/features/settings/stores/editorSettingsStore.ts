/**
 * @file editorSettingsStore.ts
 * @summary エディタ設定を管理するストア
 * @responsibility 起動設定、自動保存、編集機能、バージョン管理の設定管理
 */

import { create } from 'zustand';
import { EditorSettings, defaultEditorSettings } from '../types/editorSettings.types';
import { SettingsPersistenceService } from '../services/settingsPersistenceService';
import { logger } from '../../../utils/logger';

const STORAGE_KEY = 'editor';

interface EditorSettingsStore {
  settings: EditorSettings;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<EditorSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useEditorSettingsStore = create<EditorSettingsStore>((set, get) => ({
  settings: defaultEditorSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await SettingsPersistenceService.load(
        STORAGE_KEY,
        defaultEditorSettings
      );
      set({ settings });
    } catch (error) {
      logger.error('system', 'Failed to load editor settings', { error });
      set({ settings: defaultEditorSettings });
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates: Partial<EditorSettings>) => {
    const newSettings = { ...get().settings, ...updates };

    try {
      await SettingsPersistenceService.save(STORAGE_KEY, newSettings);
      set({ settings: newSettings });
      logger.info('system', 'Editor settings updated', { updates });
    } catch (error) {
      logger.error('system', 'Failed to update editor settings', { error });
      throw error;
    }
  },

  resetSettings: async () => {
    try {
      await SettingsPersistenceService.save(STORAGE_KEY, defaultEditorSettings);
      set({ settings: defaultEditorSettings });
      logger.info('system', 'Editor settings reset to defaults');
    } catch (error) {
      logger.error('system', 'Failed to reset editor settings', { error });
      throw error;
    }
  },
}));
