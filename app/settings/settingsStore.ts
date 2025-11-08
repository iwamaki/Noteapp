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
  fileSortMethod: 'updatedAt' | 'name'; // ファイルのソート方法（更新日時順/名前順）
  showSummary: boolean; // ファイルリストに要約を表示するかどうか

  // 9. サブスクリプション・課金設定
  subscription: {
    tier: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'canceled' | 'expired' | 'trial' | 'none';
    expiresAt?: string; // ISO 8601 形式の日時
    trialStartedAt?: string; // トライアル開始日時
    autoRenew: boolean;
  };

  // 10. 使用量情報（サーバーから同期）
  usage: {
    // 💰 コストに直結（最重要）
    monthlyInputTokens: number;  // 今月の入力トークン数（全体）
    monthlyOutputTokens: number; // 今月の出力トークン数（全体）

    // モデル別のトークン使用量（コスト計算用）
    monthlyTokensByModel: {
      [modelId: string]: {
        inputTokens: number;
        outputTokens: number;
      };
    };

    // 📊 補助的な指標
    monthlyLLMRequests: number;  // 今月のLLMリクエスト数（スパム防止、UX表示用）

    // Phase 2以降（クラウド同期時）
    currentFileCount: number;    // 現在のファイル数
    storageUsedMB: number;       // 使用中のストレージ容量（MB）

    lastSyncedAt?: string;       // 最後に同期した日時
    lastResetMonth?: string;     // 最後に月次リセットした月 (YYYY-MM形式)
  };
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
  fileSortMethod: 'updatedAt',
  showSummary: true,

  // サブスクリプション・課金設定
  subscription: {
    tier: 'free',
    status: 'none',
    expiresAt: undefined,
    trialStartedAt: undefined,
    autoRenew: false,
  },

  // 使用量情報
  usage: {
    monthlyInputTokens: 0,
    monthlyOutputTokens: 0,
    monthlyTokensByModel: {},
    monthlyLLMRequests: 0,
    currentFileCount: 0,
    storageUsedMB: 0,
    lastSyncedAt: undefined,
    lastResetMonth: undefined,
  },
};

interface SettingsStore {
  settings: AppSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;

  // 使用量トラッキング関数
  trackTokenUsage: (inputTokens: number, outputTokens: number, modelId: string) => Promise<void>;
  incrementLLMRequestCount: () => Promise<void>;
  incrementFileCount: () => Promise<void>;
  decrementFileCount: () => Promise<void>;
  updateStorageUsage: (sizeMB: number) => Promise<void>;
  resetMonthlyUsage: () => Promise<void>;
  checkAndResetMonthlyUsageIfNeeded: () => Promise<void>;
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

        // マイグレーション: monthlyTokensByModelが存在しない場合は追加
        if (parsedSettings.usage && !parsedSettings.usage.monthlyTokensByModel) {
          parsedSettings.usage.monthlyTokensByModel = {};
        }

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
      console.log('[SettingsStore] Updating settings:', updates);
      console.log('[SettingsStore] New settings:', {
        categorySortMethod: newSettings.categorySortMethod,
        fileSortMethod: newSettings.fileSortMethod
      });
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

  // =========================
  // 使用量トラッキング関数
  // =========================

  /**
   * トークン使用量を記録（モデル別にも記録）
   * @param inputTokens 入力トークン数
   * @param outputTokens 出力トークン数
   * @param modelId モデルID（例: "gemini-2.0-flash-exp", "gemini-1.5-pro"）
   */
  trackTokenUsage: async (inputTokens: number, outputTokens: number, modelId: string) => {
    const { settings } = get();

    // モデル別の使用量を更新
    const currentModelUsage = settings.usage.monthlyTokensByModel[modelId] || {
      inputTokens: 0,
      outputTokens: 0,
    };

    const updatedTokensByModel = {
      ...settings.usage.monthlyTokensByModel,
      [modelId]: {
        inputTokens: currentModelUsage.inputTokens + inputTokens,
        outputTokens: currentModelUsage.outputTokens + outputTokens,
      },
    };

    const newSettings = {
      ...settings,
      usage: {
        ...settings.usage,
        monthlyInputTokens: settings.usage.monthlyInputTokens + inputTokens,
        monthlyOutputTokens: settings.usage.monthlyOutputTokens + outputTokens,
        monthlyTokensByModel: updatedTokensByModel,
        lastSyncedAt: new Date().toISOString(),
      },
    };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    set({ settings: newSettings });
    console.log(`[UsageTracking] Tokens recorded for model ${modelId}: input=${inputTokens}, output=${outputTokens}`);
  },

  /**
   * LLMリクエスト回数をインクリメント
   */
  incrementLLMRequestCount: async () => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      usage: {
        ...settings.usage,
        monthlyLLMRequests: settings.usage.monthlyLLMRequests + 1,
        lastSyncedAt: new Date().toISOString(),
      },
    };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    set({ settings: newSettings });
  },

  /**
   * ファイル数をインクリメント
   */
  incrementFileCount: async () => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      usage: {
        ...settings.usage,
        currentFileCount: settings.usage.currentFileCount + 1,
      },
    };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    set({ settings: newSettings });
  },

  /**
   * ファイル数をデクリメント
   */
  decrementFileCount: async () => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      usage: {
        ...settings.usage,
        currentFileCount: Math.max(0, settings.usage.currentFileCount - 1),
      },
    };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    set({ settings: newSettings });
  },

  /**
   * ストレージ使用量を更新
   * @param sizeMB 使用量（MB）
   */
  updateStorageUsage: async (sizeMB: number) => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      usage: {
        ...settings.usage,
        storageUsedMB: sizeMB,
      },
    };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    set({ settings: newSettings });
  },

  /**
   * 月次使用量をリセット
   */
  resetMonthlyUsage: async () => {
    const { settings } = get();
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM形式
    const newSettings = {
      ...settings,
      usage: {
        ...settings.usage,
        monthlyInputTokens: 0,
        monthlyOutputTokens: 0,
        monthlyTokensByModel: {}, // モデル別使用量もリセット
        monthlyLLMRequests: 0,
        lastResetMonth: currentMonth,
      },
    };
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    set({ settings: newSettings });
    console.log(`[UsageTracking] Monthly usage reset for ${currentMonth}`);
  },

  /**
   * 月が変わったかチェックし、必要ならリセット
   * アプリ起動時に呼び出す
   */
  checkAndResetMonthlyUsageIfNeeded: async () => {
    const { settings, resetMonthlyUsage } = get();
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM形式
    const lastResetMonth = settings.usage.lastResetMonth;

    // 初回起動または月が変わった場合
    if (!lastResetMonth || lastResetMonth !== currentMonth) {
      console.log(`[UsageTracking] Month changed: ${lastResetMonth} → ${currentMonth}`);
      await resetMonthlyUsage();
    }
  },
}));