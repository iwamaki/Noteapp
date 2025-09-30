import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@app_settings';

// -šn‹š©
export interface AppSettings {
  // 1. h:-š
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontFamily: string;
  lineSpacing: number;
  showLineNumbers: boolean;
  syntaxHighlight: boolean;
  showMarkdownSymbols: boolean;

  // 2. Õ\-š
  startupScreen: 'note-list' | 'last-note' | 'new-note';
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // Ò
  defaultEditorMode: 'edit' | 'preview' | 'split';
  autoIndent: boolean;
  tabSize: number;
  spellCheck: boolean;
  autoComplete: boolean;

  // 3. LLMAI	-š
  privacyMode: 'normal' | 'private';
  llmService: string;
  llmApiKey: string;
  localLlmUrl: string;
  localLlmPort: string;
  aiResponseStyle: 'concise' | 'detailed' | 'custom';
  contextHistoryLength: number;

  // 4. Ðü¸çó¡-š
  versionSaveFrequency: 'every-change' | 'interval' | 'manual';
  versionSaveInterval: number; // 
  maxVersionCount: number;
  autoBackupEnabled: boolean;
  backupFrequency: number; // B“
  backupLocation: 'local' | 'cloud';
  diffDisplayStyle: 'line' | 'char' | 'both';
  defaultDiffMode: 'inline' | 'side-by-side';

  // 5. Çü¿h»­åêÆ£
  storageLocation: string;
  cloudSyncEnabled: boolean;
  exportFormat: 'markdown' | 'html' | 'pdf' | 'text';
  appLockEnabled: boolean;
  autoLockTimeout: number; // 
  encryptSensitiveNotes: boolean;

  // 6. ·¹Æàhå
  cacheLimit: number; // MB
  offlineModeEnabled: boolean;
  updateNotifications: boolean;
  backupNotifications: boolean;
  llmNotifications: boolean;
  highContrastMode: boolean;
  screenReaderOptimization: boolean;

  // 7. ¢×êÅ1
  anonymousStatsEnabled: boolean;
  diagnosticDataEnabled: boolean;
}

// ÇÕ©ëÈ-š
const defaultSettings: AppSettings = {
  // h:-š
  theme: 'system',
  fontSize: 'medium',
  fontFamily: 'System',
  lineSpacing: 1.5,
  showLineNumbers: false,
  syntaxHighlight: true,
  showMarkdownSymbols: true,

  // Õ\-š
  startupScreen: 'note-list',
  autoSaveEnabled: true,
  autoSaveInterval: 30,
  defaultEditorMode: 'edit',
  autoIndent: true,
  tabSize: 2,
  spellCheck: true,
  autoComplete: true,

  // LLM-š
  privacyMode: 'normal',
  llmService: 'openai',
  llmApiKey: '',
  localLlmUrl: 'http://localhost',
  localLlmPort: '8080',
  aiResponseStyle: 'concise',
  contextHistoryLength: 10,

  // Ðü¸çó¡
  versionSaveFrequency: 'every-change',
  versionSaveInterval: 10,
  maxVersionCount: 50,
  autoBackupEnabled: true,
  backupFrequency: 24,
  backupLocation: 'local',
  diffDisplayStyle: 'both',
  defaultDiffMode: 'side-by-side',

  // Çü¿h»­åêÆ£
  storageLocation: 'default',
  cloudSyncEnabled: false,
  exportFormat: 'markdown',
  appLockEnabled: false,
  autoLockTimeout: 5,
  encryptSensitiveNotes: false,

  // ·¹Æàhå
  cacheLimit: 100,
  offlineModeEnabled: false,
  updateNotifications: true,
  backupNotifications: true,
  llmNotifications: true,
  highContrastMode: false,
  screenReaderOptimization: false,

  // ¢×êÅ1
  anonymousStatsEnabled: false,
  diagnosticDataEnabled: false,
};

interface SettingsStore {
  settings: AppSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        set({ settings: { ...defaultSettings, ...parsedSettings } });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates: Partial<AppSettings>) => {
    try {
      const newSettings = { ...get().settings, ...updates };
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      set({ settings: newSettings });
    } catch (error) {
      console.error('Failed to update settings:', error);
      throw error;
    }
  },

  resetSettings: async () => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaultSettings));
      set({ settings: defaultSettings });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  },
}));