/**
 * @file settingsStore.ts
 * @summary このファイルは、Zustandを使用してアプリケーションの設定状態を管理します。
 * ユーザーインターフェース、編集機能、LLM（大規模言語モデル）連携、バージョン管理、ストレージ、およびその他の一般設定を定義し、永続化します。
 * @responsibility アプリケーションの各種設定の読み込み、更新、リセット機能を提供し、設定変更を AsyncStorage に保存することで、
 * アプリケーション全体で一貫したユーザー設定を維持します。また、デフォルト設定値も定義します。
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getModelCategoryFromId } from '../features/llmService/utils/modelCategoryHelper';
import { providerCache } from '../features/llmService/cache/providerCache';

const SETTINGS_STORAGE_KEY = '@app_settings';

// トークン容量制限（カテゴリーごとの全モデル合計上限）
export const TOKEN_CAPACITY_LIMITS = {
  quick: 5000000, // Quick カテゴリー: 5M tokens
  think: 1000000, // Think カテゴリー: 1M tokens
} as const;

// 購入履歴レコード
export interface PurchaseRecord {
  id: string; // ユニークID
  type: 'initial' | 'addon'; // 購入タイプ（単発購入のみ）
  productId: string; // プロダクトID
  purchaseToken: string; // 購入トークン（IAP検証用）
  transactionId: string; // トランザクションID
  purchaseDate: string; // 購入日時（ISO 8601）
  amount: number; // 支払額（円）
  creditsAdded: number; // 追加されたクレジット額（円建て）
}

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

  // 9. トークン残高とクレジット
  tokenBalance: {
    credits: number; // 未配分のクレジット（円建て）
    allocatedTokens: {
      [modelId: string]: number; // モデルIDごとの配分済みトークン数
    };
  };

  // 10. 装填中のモデル（Quick/Thinkスロットに装填されているモデル）
  loadedModels: {
    quick: string; // Quickスロットに装填されているモデルID
    think: string; // Thinkスロットに装填されているモデルID
  };

  // 11. 現在アクティブなモデルカテゴリー（UIの表示制御用）
  activeModelCategory: 'quick' | 'think';

  // 12. 購入履歴
  purchaseHistory: PurchaseRecord[];

  // 13. 使用量情報（統計表示用）
  usage: {
    // 💰 コスト計算用（レガシー）
    monthlyInputTokens: number;  // 今月の入力トークン数（全体）
    monthlyOutputTokens: number; // 今月の出力トークン数（全体）

    // モデル別の詳細使用量（サブスク上限チェック + コスト計算用）
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

  // トークン残高とクレジット
  tokenBalance: {
    credits: 0, // 未配分クレジット
    allocatedTokens: {
      'gemini-2.5-flash': 0,
      'gemini-2.5-pro': 0,
    },
  },

  // 装填中のモデル
  loadedModels: {
    quick: 'gemini-2.5-flash', // デフォルトはGemini 2.5 Flash
    think: 'gemini-2.5-pro',   // デフォルトはGemini 2.5 Pro
  },

  // 現在アクティブなモデルカテゴリー
  activeModelCategory: 'quick', // デフォルトはQuickモデル

  // 購入履歴
  purchaseHistory: [],

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

  // トークン残高管理関数（API経由）
  loadTokenBalance: () => Promise<void>;
  refreshTokenBalance: () => Promise<void>;
  getTotalTokensByCategory: (category: 'quick' | 'think') => number;
  loadModel: (category: 'quick' | 'think', modelId: string) => Promise<void>;
  getPurchaseHistory: () => PurchaseRecord[];
  resetTokensAndUsage: () => Promise<void>; // デバッグ用：トークン残高と使用量をリセット

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

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  isLoading: false,
  shouldShowAllocationModal: false,

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
      // エラー時はデフォルト設定を使用
      set({ settings: defaultSettings });
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
  // トークン残高管理関数
  // =========================

  /**
   * カテゴリーごとの合計トークン数を取得
   * @param category カテゴリー ('quick' または 'think')
   * @returns カテゴリー内の全モデルのトークン合計
   */
  getTotalTokensByCategory: (category: 'quick' | 'think') => {
    const { settings } = get();
    const { allocatedTokens } = settings.tokenBalance;

    // グローバルキャッシュから取得（循環参照回避）
    const providersCache = providerCache.getCache();

    let total = 0;
    for (const [modelId, balance] of Object.entries(allocatedTokens)) {
      if (getModelCategoryFromId(modelId, providersCache) === category) {
        total += balance;
      }
    }
    return total;
  },

  /**
   * トークン残高をAPIから取得してキャッシュを更新
   * アプリ起動時および各操作後に呼び出される
   */
  loadTokenBalance: async () => {
    try {
      // BillingApiServiceをインポート（遅延インポートで循環依存を回避）
      const { getBillingApiService, isBillingApiServiceInitialized } = await import('../billing/services/billingApiService');

      // 初期化されていない場合はスキップ（初期化前の呼び出しを許容）
      if (!isBillingApiServiceInitialized()) {
        console.warn('[SettingsStore] BillingApiService not initialized, skipping balance load');
        return;
      }

      // 認証トークンの確認（認証されていない場合はスキップ）
      const { getAccessToken } = await import('../auth/tokenService');
      const accessToken = await getAccessToken();

      if (!accessToken) {
        console.warn('[SettingsStore] No access token found, skipping balance load');
        return;
      }

      const billingService = getBillingApiService();
      const balance = await billingService.getBalance();

      const { settings } = get();
      const newSettings = {
        ...settings,
        tokenBalance: {
          credits: balance.credits || 0,
          allocatedTokens: balance.allocatedTokens || {},
        },
      };

      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      set({ settings: newSettings });
      console.log('[SettingsStore] Token balance loaded from API:', {
        credits: balance.credits,
        models: Object.keys(balance.allocatedTokens).length,
      });
    } catch (error) {
      console.error('[SettingsStore] Failed to load token balance:', error);
      // エラー時はローカルのキャッシュを使用（通信エラーに備える）
    }
  },

  /**
   * トークン残高を更新（各操作後に呼び出す）
   * loadTokenBalance() のエイリアス
   */
  refreshTokenBalance: async () => {
    await get().loadTokenBalance();
  },

  /**
   * モデルをスロットに装填する
   * @param category カテゴリー ('quick' または 'think')
   * @param modelId 装填するモデルID（例: "gemini-2.5-flash"）
   */
  loadModel: async (category: 'quick' | 'think', modelId: string) => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      loadedModels: {
        ...settings.loadedModels,
        [category]: modelId,
      },
      activeModelCategory: category, // アクティブカテゴリーも更新
    };

    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    set({ settings: newSettings });
    console.log(`[ModelLoading] Loaded ${modelId} into ${category} slot, set active category to ${category}`);

    // 注: APIService へのモデル変更通知は、チャット画面などの
    // 上位コンポーネントで行います（循環参照回避のため）
  },

  /**
   * 購入履歴を取得
   */
  getPurchaseHistory: () => {
    return get().settings.purchaseHistory;
  },

  /**
   * トークン残高と使用量をリセット（デバッグ用）
   * バックエンドDBとローカルキャッシュの両方をリセット
   */
  resetTokensAndUsage: async () => {
    try {
      // 1. バックエンドDBをリセット
      const { getBillingApiService } = await import('../billing/services/billingApiService');
      const billingService = getBillingApiService();
      await billingService.resetAllData();

      // 2. ローカルキャッシュをリセット
      const { settings } = get();
      const newSettings = {
        ...settings,
        tokenBalance: {
          credits: 0,
          allocatedTokens: {},
        },
        purchaseHistory: [],
        usage: {
          ...settings.usage,
          monthlyLLMRequests: 0,
          monthlyTokensByModel: {},
        },
      };
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      set({ settings: newSettings });
      console.log('[Debug] Token balance, credits, and usage reset (backend + local)');
    } catch (error) {
      console.error('[Debug] Failed to reset tokens and usage:', error);
      throw error;
    }
  },

  // =========================
  // 認証状態変更ハンドラ
  // =========================

  /**
   * 認証状態が変更された時の処理
   * authStoreから呼び出され、トークン残高と使用量を適切に管理する
   *
   * @param userId ログイン後のユーザーID、またはログアウト時はnull
   */
  handleAuthenticationChange: async (userId: string | null) => {
    const { settings } = get();

    if (userId) {
      // ========== ログイン時 ==========
      // 新しいアカウントのトークン残高を取得
      console.log('[SettingsStore] User logged in, refreshing token balance for new account');

      try {
        await get().loadTokenBalance();
        console.log('[SettingsStore] Token balance loaded for user:', userId.substring(0, 8));
      } catch (error) {
        // 残高取得失敗はログインを失敗させない（ローカルキャッシュで継続可能）
        console.warn('[SettingsStore] Failed to load token balance after login:', error);
      }
    } else {
      // ========== ログアウト時 ==========
      // トークン残高、購入履歴、使用量をクリア
      console.log('[SettingsStore] User logged out, clearing token balance and usage');

      try {
        const newSettings = {
          ...settings,
          tokenBalance: {
            credits: 0,
            allocatedTokens: {},
          },
          purchaseHistory: [],
          usage: {
            ...settings.usage,
            monthlyInputTokens: 0,
            monthlyOutputTokens: 0,
            monthlyTokensByModel: {},
            monthlyLLMRequests: 0,
          },
        };

        await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
        set({ settings: newSettings });
        console.log('[SettingsStore] Token balance and usage cleared');
      } catch (error) {
        // クリア失敗は警告のみ（ログアウト自体は失敗させない）
        console.error('[SettingsStore] Failed to clear token balance:', error);
      }
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

  // UI状態管理
  setShouldShowAllocationModal: (should: boolean) => {
    set({ shouldShowAllocationModal: should });
  },
}));