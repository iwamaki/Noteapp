/**
 * @file llmSettingsStore.ts
 * @summary LLM/AI設定を管理するストア
 * @responsibility LLM基本設定、ローカルLLM設定、AI応答設定の管理
 */

import { create } from 'zustand';
import { LLMSettings, defaultLLMSettings } from '../types/llmSettings.types';
import { SettingsPersistenceService } from '../services/settingsPersistenceService';
import { logger } from '../../../utils/logger';

const STORAGE_KEY = 'llm';

interface LLMSettingsStore {
  settings: LLMSettings;
  isLoading: boolean;

  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<LLMSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useLLMSettingsStore = create<LLMSettingsStore>((set, get) => ({
  settings: defaultLLMSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await SettingsPersistenceService.load(
        STORAGE_KEY,
        defaultLLMSettings
      );
      set({ settings });
    } catch (error) {
      logger.error('system', 'Failed to load settings', error);
      set({ settings: defaultLLMSettings });
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates: Partial<LLMSettings>) => {
    const newSettings = { ...get().settings, ...updates };

    try {
      await SettingsPersistenceService.save(STORAGE_KEY, newSettings);
      set({ settings: newSettings });
      logger.info('system', 'Settings updated', updates);
    } catch (error) {
      logger.error('system', 'Failed to update settings', error);
      throw error;
    }
  },

  resetSettings: async () => {
    try {
      await SettingsPersistenceService.save(STORAGE_KEY, defaultLLMSettings);
      set({ settings: defaultLLMSettings });
      logger.info('system', 'Settings reset to defaults');
    } catch (error) {
      logger.error('system', 'Failed to reset settings', error);
      throw error;
    }
  },
}));
