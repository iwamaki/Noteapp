/**
 * @file settingsFacade.ts
 * @summary 既存コードとの互換性を保つためのファサード
 * @description 旧settingsStoreのインターフェースを維持しながら、
 * 内部的には分割されたストアに処理を委譲する
 *
 * @note このファサードは段階的な移行のための一時的なものです。
 * 将来的には各コンポーネントが個別のストアを直接使用するように変更し、
 * このファイルは削除される予定です。
 */

import { create } from 'zustand';
import { useUISettingsStore } from './uiSettingsStore';
import { useEditorSettingsStore } from './editorSettingsStore';
import { useLLMSettingsStore } from './llmSettingsStore';
import { useSystemSettingsStore } from './systemSettingsStore';
import { useTokenBalanceStore } from './tokenBalanceStore';
import { useUsageTrackingStore } from './usageTrackingStore';
import { PurchaseRecord, TOKEN_CAPACITY_LIMITS } from '../types/tokenBalance.types';

// 互換性のための旧型定義（将来的に削除予定）
export interface AppSettings {
  // UI設定
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  fontFamily: string;
  lineSpacing: number;
  showLineNumbers: boolean;
  syntaxHighlight: boolean;
  showMarkdownSymbols: boolean;
  highContrastMode: boolean;
  screenReaderOptimization: boolean;
  categorySortMethod: 'name' | 'fileCount';
  fileSortMethod: 'updatedAt' | 'name';
  showSummary: boolean;

  // エディタ設定
  startupScreen: 'file-list' | 'last-file' | 'new-file';
  autoSaveEnabled: boolean;
  autoSaveInterval: number;
  defaultEditorMode: 'edit' | 'preview' | 'split';
  defaultFileViewScreen: 'edit' | 'preview';
  autoIndent: boolean;
  tabSize: number;
  spellCheck: boolean;
  autoComplete: boolean;
  versionSaveFrequency: 'every-change' | 'interval' | 'manual';
  versionSaveInterval: number;
  maxVersionCount: number;
  autoBackupEnabled: boolean;
  backupFrequency: number;
  backupLocation: 'local' | 'cloud';
  diffDisplayStyle: 'line' | 'char' | 'both';
  defaultDiffMode: 'inline' | 'side-by-side';

  // LLM設定
  llmEnabled: boolean;
  privacyMode: 'normal' | 'private';
  llmService: string;
  llmApiKey: string;
  localLlmUrl: string;
  localLlmPort: string;
  aiResponseStyle: 'concise' | 'detailed' | 'custom';
  contextHistoryLength: number;
  sendFileContextToLLM: boolean;
  llmContextMaxDepth: number;
  llmNotifications: boolean;

  // システム設定
  storageLocation: string;
  cloudSyncEnabled: boolean;
  exportFormat: 'markdown' | 'html' | 'pdf' | 'text';
  appLockEnabled: boolean;
  autoLockTimeout: number;
  encryptSensitiveFiles: boolean;
  cacheLimit: number;
  offlineModeEnabled: boolean;
  updateNotifications: boolean;
  backupNotifications: boolean;
  anonymousStatsEnabled: boolean;
  diagnosticDataEnabled: boolean;

  // トークン残高とクレジット
  tokenBalance: {
    credits: number;
    allocatedTokens: {
      [modelId: string]: number;
    };
  };

  // 装填中のモデル
  loadedModels: {
    quick: string;
    think: string;
  };

  // 現在アクティブなモデルカテゴリー
  activeModelCategory: 'quick' | 'think';

  // 購入履歴
  purchaseHistory: PurchaseRecord[];

  // 使用量情報
  usage: {
    monthlyInputTokens: number;
    monthlyOutputTokens: number;
    monthlyTokensByModel: {
      [modelId: string]: {
        inputTokens: number;
        outputTokens: number;
      };
    };
    monthlyLLMRequests: number;
    currentFileCount: number;
    storageUsedMB: number;
    lastSyncedAt?: string;
    lastResetMonth?: string;
  };
}

export { TOKEN_CAPACITY_LIMITS };

interface SettingsStore {
  settings: AppSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;

  // トークン残高管理関数（API経由）
  loadTokenBalance: () => Promise<void>;
  refreshTokenBalance: () => Promise<void>;
  getTotalTokensByCategory: (category: 'quick' | 'think') => number;
  loadModel: (category: 'quick' | 'think', modelId: string) => Promise<void>;
  getPurchaseHistory: () => PurchaseRecord[];
  resetTokensAndUsage: () => Promise<void>;

  // 認証状態変更ハンドラ
  handleAuthenticationChange: (userId: string | null) => Promise<void>;

  // UI状態管理
  shouldShowAllocationModal: boolean;
  setShouldShowAllocationModal: (should: boolean) => void;

  // 使用量トラッキング関数
  trackTokenUsage: (inputTokens: number, outputTokens: number, modelId: string) => Promise<void>;
  incrementLLMRequestCount: () => Promise<void>;
  incrementFileCount: () => Promise<void>;
  decrementFileCount: () => Promise<void>;
  updateStorageUsage: (sizeMB: number) => Promise<void>;
  resetMonthlyUsage: () => Promise<void>;
  checkAndResetMonthlyUsageIfNeeded: () => Promise<void>;
}

/**
 * 各ストアから設定を集約
 */
function aggregateSettings(): AppSettings {
  const uiSettings = useUISettingsStore.getState().settings;
  const editorSettings = useEditorSettingsStore.getState().settings;
  const llmSettings = useLLMSettingsStore.getState().settings;
  const systemSettings = useSystemSettingsStore.getState().settings;
  const tokenBalance = useTokenBalanceStore.getState();
  const usageTracking = useUsageTrackingStore.getState();

  return {
    // UI設定
    ...uiSettings,

    // エディタ設定
    ...editorSettings,

    // LLM設定
    ...llmSettings,

    // システム設定
    ...systemSettings,

    // トークン残高
    tokenBalance: tokenBalance.balance,
    loadedModels: tokenBalance.loadedModels,
    activeModelCategory: tokenBalance.activeModelCategory,
    purchaseHistory: tokenBalance.purchaseHistory,

    // 使用量
    usage: usageTracking.usage,
  };
}

/**
 * 旧settingsStoreと互換性のあるファサードストア
 */
export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: aggregateSettings(),
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    try {
      // 各ストアを並列で読み込み
      await Promise.all([
        useUISettingsStore.getState().loadSettings(),
        useEditorSettingsStore.getState().loadSettings(),
        useLLMSettingsStore.getState().loadSettings(),
        useSystemSettingsStore.getState().loadSettings(),
        useTokenBalanceStore.getState().loadData(),
        useUsageTrackingStore.getState().loadUsage(),
      ]);

      // 集約した設定を反映
      set({ settings: aggregateSettings() });
    } catch (error) {
      console.error('[SettingsFacade] Failed to load settings:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  updateSettings: async (updates: Partial<AppSettings>) => {
    try {
      // 各カテゴリーに応じて適切なストアに委譲
      const uiUpdates: any = {};
      const editorUpdates: any = {};
      const llmUpdates: any = {};
      const systemUpdates: any = {};

      // UI設定
      const uiKeys = ['theme', 'fontSize', 'fontFamily', 'lineSpacing', 'showLineNumbers', 'syntaxHighlight', 'showMarkdownSymbols', 'highContrastMode', 'screenReaderOptimization', 'categorySortMethod', 'fileSortMethod', 'showSummary'];
      for (const key of uiKeys) {
        if (key in updates) {
          uiUpdates[key] = updates[key as keyof AppSettings];
        }
      }

      // エディタ設定
      const editorKeys = ['startupScreen', 'autoSaveEnabled', 'autoSaveInterval', 'defaultEditorMode', 'defaultFileViewScreen', 'autoIndent', 'tabSize', 'spellCheck', 'autoComplete', 'versionSaveFrequency', 'versionSaveInterval', 'maxVersionCount', 'autoBackupEnabled', 'backupFrequency', 'backupLocation', 'diffDisplayStyle', 'defaultDiffMode'];
      for (const key of editorKeys) {
        if (key in updates) {
          editorUpdates[key] = updates[key as keyof AppSettings];
        }
      }

      // LLM設定
      const llmKeys = ['llmEnabled', 'privacyMode', 'llmService', 'llmApiKey', 'localLlmUrl', 'localLlmPort', 'aiResponseStyle', 'contextHistoryLength', 'sendFileContextToLLM', 'llmContextMaxDepth', 'llmNotifications'];
      for (const key of llmKeys) {
        if (key in updates) {
          llmUpdates[key] = updates[key as keyof AppSettings];
        }
      }

      // システム設定
      const systemKeys = ['storageLocation', 'cloudSyncEnabled', 'exportFormat', 'appLockEnabled', 'autoLockTimeout', 'encryptSensitiveFiles', 'cacheLimit', 'offlineModeEnabled', 'updateNotifications', 'backupNotifications', 'anonymousStatsEnabled', 'diagnosticDataEnabled'];
      for (const key of systemKeys) {
        if (key in updates) {
          systemUpdates[key] = updates[key as keyof AppSettings];
        }
      }

      // 各ストアを更新
      const promises: Promise<void>[] = [];
      if (Object.keys(uiUpdates).length > 0) {
        promises.push(useUISettingsStore.getState().updateSettings(uiUpdates));
      }
      if (Object.keys(editorUpdates).length > 0) {
        promises.push(useEditorSettingsStore.getState().updateSettings(editorUpdates));
      }
      if (Object.keys(llmUpdates).length > 0) {
        promises.push(useLLMSettingsStore.getState().updateSettings(llmUpdates));
      }
      if (Object.keys(systemUpdates).length > 0) {
        promises.push(useSystemSettingsStore.getState().updateSettings(systemUpdates));
      }

      await Promise.all(promises);

      // 集約した設定を反映
      set({ settings: aggregateSettings() });
    } catch (error) {
      console.error('[SettingsFacade] Failed to update settings:', error);
      throw error;
    }
  },

  resetSettings: async () => {
    try {
      await Promise.all([
        useUISettingsStore.getState().resetSettings(),
        useEditorSettingsStore.getState().resetSettings(),
        useLLMSettingsStore.getState().resetSettings(),
        useSystemSettingsStore.getState().resetSettings(),
      ]);

      set({ settings: aggregateSettings() });
    } catch (error) {
      console.error('[SettingsFacade] Failed to reset settings:', error);
      throw error;
    }
  },

  // トークン残高管理（TokenBalanceStoreに委譲）
  loadTokenBalance: async () => {
    await useTokenBalanceStore.getState().loadTokenBalance();
    set({ settings: aggregateSettings() });
  },

  refreshTokenBalance: async () => {
    await useTokenBalanceStore.getState().refreshTokenBalance();
    set({ settings: aggregateSettings() });
  },

  getTotalTokensByCategory: (category: 'quick' | 'think') => {
    return useTokenBalanceStore.getState().getTotalTokensByCategory(category);
  },

  loadModel: async (category: 'quick' | 'think', modelId: string) => {
    await useTokenBalanceStore.getState().loadModel(category, modelId);
    set({ settings: aggregateSettings() });
  },

  getPurchaseHistory: () => {
    return useTokenBalanceStore.getState().getPurchaseHistory();
  },

  resetTokensAndUsage: async () => {
    await useTokenBalanceStore.getState().resetTokensAndUsage();
    await useUsageTrackingStore.getState().resetMonthlyUsage();
    set({ settings: aggregateSettings() });
  },

  handleAuthenticationChange: async (userId: string | null) => {
    await Promise.all([
      useTokenBalanceStore.getState().handleAuthenticationChange(userId),
      useUsageTrackingStore.getState().handleAuthenticationChange(userId),
    ]);
    set({ settings: aggregateSettings() });
  },

  // UI状態管理（TokenBalanceStoreに委譲）
  shouldShowAllocationModal: false,
  setShouldShowAllocationModal: (should: boolean) => {
    useTokenBalanceStore.getState().setShouldShowAllocationModal(should);
    set({ shouldShowAllocationModal: should });
  },

  // 使用量トラッキング（UsageTrackingStoreに委譲）
  trackTokenUsage: async (inputTokens: number, outputTokens: number, modelId: string) => {
    await useUsageTrackingStore.getState().trackTokenUsage(inputTokens, outputTokens, modelId);
    set({ settings: aggregateSettings() });
  },

  incrementLLMRequestCount: async () => {
    await useUsageTrackingStore.getState().incrementLLMRequestCount();
    set({ settings: aggregateSettings() });
  },

  incrementFileCount: async () => {
    await useUsageTrackingStore.getState().incrementFileCount();
    set({ settings: aggregateSettings() });
  },

  decrementFileCount: async () => {
    await useUsageTrackingStore.getState().decrementFileCount();
    set({ settings: aggregateSettings() });
  },

  updateStorageUsage: async (sizeMB: number) => {
    await useUsageTrackingStore.getState().updateStorageUsage(sizeMB);
    set({ settings: aggregateSettings() });
  },

  resetMonthlyUsage: async () => {
    await useUsageTrackingStore.getState().resetMonthlyUsage();
    set({ settings: aggregateSettings() });
  },

  checkAndResetMonthlyUsageIfNeeded: async () => {
    await useUsageTrackingStore.getState().checkAndResetMonthlyUsageIfNeeded();
    set({ settings: aggregateSettings() });
  },
}));

// 各ストアの変更を監視して、ファサードを自動更新
useUISettingsStore.subscribe(() => {
  useSettingsStore.setState({ settings: aggregateSettings() });
});

useEditorSettingsStore.subscribe(() => {
  useSettingsStore.setState({ settings: aggregateSettings() });
});

useLLMSettingsStore.subscribe(() => {
  useSettingsStore.setState({ settings: aggregateSettings() });
});

useSystemSettingsStore.subscribe(() => {
  useSettingsStore.setState({ settings: aggregateSettings() });
});

useTokenBalanceStore.subscribe((state) => {
  useSettingsStore.setState({
    settings: aggregateSettings(),
    shouldShowAllocationModal: state.shouldShowAllocationModal,
  });
});

useUsageTrackingStore.subscribe(() => {
  useSettingsStore.setState({ settings: aggregateSettings() });
});
