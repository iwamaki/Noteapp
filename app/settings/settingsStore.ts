/**
 * @file settingsStore.ts
 * @summary このファイルは、Zustandを使用してアプリケーションの設定状態を管理します。
 * ユーザーインターフェース、編集機能、LLM（大規模言語モデル）連携、バージョン管理、ストレージ、およびその他の一般設定を定義し、永続化します。
 * @responsibility アプリケーションの各種設定の読み込み、更新、リセット機能を提供し、設定変更を AsyncStorage に保存することで、
 * アプリケーション全体で一貫したユーザー設定を維持します。また、デフォルト設定値も定義します。
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_STORAGE_KEY = '@app_settings';

// アプリケーション設定の型定義
export interface AppSettings {
  // 1. UI設定
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontFamily: string;
  lineSpacing: number;
  showLineNumbers: boolean;
  syntaxHighlight: boolean;
  showMarkdownSymbols: boolean;

  // 2. 編集設定
  startupScreen: 'file-list' | 'last-file' | 'new-file';
  autoSaveEnabled: boolean;
  autoSaveInterval: number; // 秒
  defaultEditorMode: 'edit' | 'preview' | 'split';
  defaultFileViewScreen: 'edit' | 'preview'; // ファイルリストからファイルを開く際のデフォルト表示画面
  autoIndent: boolean;
  tabSize: number;
  spellCheck: boolean;
  autoComplete: boolean;

  // 3. LLM/AI設定
  llmEnabled: boolean; // LLM機能の有効/無効
  privacyMode: 'normal' | 'private';
  llmService: string;
  llmProvider: string; // 現在選択中のLLMプロバイダー (openai, gemini, etc.)
  llmModel: string; // 現在選択中のLLMモデル (gpt-4, gemini-1.5-pro, etc.)
  llmApiKey: string;
  localLlmUrl: string;
  localLlmPort: string;
  aiResponseStyle: 'concise' | 'detailed' | 'custom';
  contextHistoryLength: number;
  sendFileContextToLLM: boolean; // ファイルコンテキストをLLMに送信するかどうか
  llmContextMaxDepth: number; // LLMに渡すファイルリストの最大階層

  // 4. バージョン管理/バックアップ設定
  versionSaveFrequency: 'every-change' | 'interval' | 'manual';
  versionSaveInterval: number; // 秒
  maxVersionCount: number;
  autoBackupEnabled: boolean;
  backupFrequency: number; // 時間
  backupLocation: 'local' | 'cloud';
  diffDisplayStyle: 'line' | 'char' | 'both';
  defaultDiffMode: 'inline' | 'side-by-side';

  // 5. セキュリティ/ストレージ設定
  storageLocation: string;
  cloudSyncEnabled: boolean;
  exportFormat: 'markdown' | 'html' | 'pdf' | 'text';
  appLockEnabled: boolean;
  autoLockTimeout: number; // 分
  encryptSensitiveFiles: boolean;

  // 6. その他
  cacheLimit: number; // MB
  offlineModeEnabled: boolean;
  updateNotifications: boolean;
  backupNotifications: boolean;
  llmNotifications: boolean;
  highContrastMode: boolean;
  screenReaderOptimization: boolean;

  // 7. 開発者設定
  anonymousStatsEnabled: boolean;
  diagnosticDataEnabled: boolean;

  // 8. ファイルリスト表示設定
  categorySortMethod: 'name' | 'fileCount';
  showSummary: boolean; // ファイルリストに要約を表示するかどうか
}

// デフォルト設定値
const defaultSettings: AppSettings = {
  // UI設定
  theme: 'system',
  fontSize: 'medium',
  fontFamily: 'System',
  lineSpacing: 1.5,
  showLineNumbers: false,
  syntaxHighlight: true,
  showMarkdownSymbols: true,

  // 編集設定
  startupScreen: 'file-list',
  autoSaveEnabled: true,
  autoSaveInterval: 30,
  defaultEditorMode: 'edit',
  defaultFileViewScreen: 'edit',
  autoIndent: true,
  tabSize: 2,
  spellCheck: true,
  autoComplete: true,

  // LLM/AI設定
  llmEnabled: process.env.EXPO_PUBLIC_LLM_ENABLED === 'true',
  privacyMode: 'normal',
  llmService: 'openai',
  llmProvider: 'openai',
  llmModel: 'gpt-4',
  llmApiKey: '',
  localLlmUrl: 'http://localhost',
  localLlmPort: '8080',
  aiResponseStyle: 'concise',
  contextHistoryLength: 10,
  sendFileContextToLLM: true,
  llmContextMaxDepth: 3,

  // バージョン管理/バックアップ設定
  versionSaveFrequency: 'every-change',
  versionSaveInterval: 10,
  maxVersionCount: 50,
  autoBackupEnabled: true,
  backupFrequency: 24,
  backupLocation: 'local',
  diffDisplayStyle: 'both',
  defaultDiffMode: 'side-by-side',

  // セキュリティ/ストレージ設定
  storageLocation: 'default',
  cloudSyncEnabled: false,
  exportFormat: 'markdown',
  appLockEnabled: false,
  autoLockTimeout: 5,
  encryptSensitiveFiles: false,

  // その他
  cacheLimit: 100,
  offlineModeEnabled: false,
  updateNotifications: true,
  backupNotifications: true,
  llmNotifications: true,
  highContrastMode: false,
  screenReaderOptimization: false,

  // 開発者設定
  anonymousStatsEnabled: false,
  diagnosticDataEnabled: false,

  // ファイルリスト表示設定
  categorySortMethod: 'fileCount',
  showSummary: true,
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