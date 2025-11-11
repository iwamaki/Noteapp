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

  // 11. 購入履歴
  purchaseHistory: PurchaseRecord[];

  // 12. 使用量情報（統計表示用）
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

  // クレジット・トークン管理関数
  addCredits: (credits: number, purchaseRecord: PurchaseRecord) => Promise<void>;
  allocateCredits: (allocations: Array<{ modelId: string; credits: number }>) => Promise<void>;
  deductTokens: (modelId: string, tokens: number) => Promise<void>;
  loadModel: (category: 'quick' | 'think', modelId: string) => Promise<void>;
  getTotalTokensByCategory: (category: 'quick' | 'think') => number;
  getPurchaseHistory: () => PurchaseRecord[];
  resetTokensAndUsage: () => Promise<void>; // デバッグ用：トークン残高と使用量をリセット

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

        // マイグレーション1: monthlyTokensByModelが存在しない場合は追加
        if (parsedSettings.usage && !parsedSettings.usage.monthlyTokensByModel) {
          parsedSettings.usage.monthlyTokensByModel = {};
        }

        // マイグレーション2: subscription フィールドを削除（レガシー互換性）
        if (parsedSettings.subscription) {
          console.log('[SettingsStore] Removing legacy subscription field');
          delete parsedSettings.subscription;
        }

        // マイグレーション3: tokenBalance をカテゴリー単位からモデル単位に変換
        if (parsedSettings.tokenBalance && !parsedSettings.tokenBalance.byModel && !parsedSettings.tokenBalance.allocatedTokens) {
          console.log('[SettingsStore] Migrating tokenBalance from category-based to model-based');
          const oldBalance = parsedSettings.tokenBalance;
          parsedSettings.tokenBalance = {
            credits: 0,
            allocatedTokens: {
              'gemini-2.5-flash': oldBalance.flash || 0,
              'gemini-2.5-pro': oldBalance.pro || 0,
            },
          };
        }

        // マイグレーション6: tokenBalance.byModel を allocatedTokens に変換 + credits追加
        if (parsedSettings.tokenBalance && parsedSettings.tokenBalance.byModel && !parsedSettings.tokenBalance.allocatedTokens) {
          console.log('[SettingsStore] Migrating tokenBalance.byModel to allocatedTokens + credits');
          const oldBalance = parsedSettings.tokenBalance.byModel;
          parsedSettings.tokenBalance = {
            credits: 0, // 既存のトークンはそのまま、新しいクレジットは0から
            allocatedTokens: oldBalance,
          };
        }

        // マイグレーション7: credits フィールドが存在しない場合は追加
        if (parsedSettings.tokenBalance && parsedSettings.tokenBalance.credits === undefined) {
          console.log('[SettingsStore] Adding credits field to tokenBalance');
          parsedSettings.tokenBalance.credits = 0;
        }

        // マイグレーション4: loadedModels が存在しない場合は追加
        if (!parsedSettings.loadedModels) {
          console.log('[SettingsStore] Adding loadedModels with default values');
          parsedSettings.loadedModels = {
            quick: 'gemini-2.5-flash',
            think: 'gemini-2.5-pro',
          };
        }

        // マイグレーション5: purchaseHistory のレコード形式を変換
        if (parsedSettings.purchaseHistory && Array.isArray(parsedSettings.purchaseHistory)) {
          parsedSettings.purchaseHistory = parsedSettings.purchaseHistory.map((record: any) => {
            // 旧形式1: tokensAdded: {flash, pro} → creditsAdded
            if (record.tokensAdded && typeof record.tokensAdded === 'object' && !record.creditsAdded) {
              console.log('[SettingsStore] Migrating purchase record (tokensAdded object):', record.id);
              // amountをそのままcreditsAddedとして使用（1円=1credit）
              return {
                ...record,
                creditsAdded: record.amount || 0,
              };
            }
            // 旧形式2: tokensAdded: number, targetModel → creditsAdded
            if (record.tokensAdded && typeof record.tokensAdded === 'number' && !record.creditsAdded) {
              console.log('[SettingsStore] Migrating purchase record (tokensAdded number):', record.id);
              return {
                ...record,
                creditsAdded: record.amount || 0,
              };
            }
            return record;
          });
        }

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

      // LLM設定が変更された場合、APIServiceにも反映
      if (updates.llmProvider !== undefined || updates.llmModel !== undefined) {
        const { default: APIService } = await import('../features/chat/llmService/api');

        if (updates.llmProvider !== undefined) {
          APIService.setLLMProvider(updates.llmProvider);
          console.log('[SettingsStore] Updated LLM provider in APIService:', updates.llmProvider);
        }

        if (updates.llmModel !== undefined) {
          APIService.setLLMModel(updates.llmModel);
          console.log('[SettingsStore] Updated LLM model in APIService:', updates.llmModel);
        }
      }
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

    // APIServiceのメタデータを使用してカテゴリー判定
    // 動的インポートで循環依存を回避
    let getModelCategory: (modelId: string) => 'quick' | 'think';
    try {
      const APIService = require('../features/chat/llmService/api').default;
      getModelCategory = (modelId: string) => APIService.getModelCategory(modelId);
    } catch (error) {
      // フォールバック
      console.warn('Failed to load APIService, using fallback for category detection');
      getModelCategory = (modelId: string) =>
        modelId.toLowerCase().includes('flash') ? 'quick' : 'think';
    }

    let total = 0;
    for (const [modelId, balance] of Object.entries(allocatedTokens)) {
      if (getModelCategory(modelId) === category) {
        total += balance;
      }
    }
    return total;
  },

  /**
   * クレジットを追加（購入時に呼び出される）
   * @param credits 追加するクレジット額（円建て）
   * @param purchaseRecord 購入履歴レコード
   */
  addCredits: async (credits: number, purchaseRecord: PurchaseRecord) => {
    const { settings } = get();

    const newSettings = {
      ...settings,
      tokenBalance: {
        ...settings.tokenBalance,
        credits: settings.tokenBalance.credits + credits,
      },
      purchaseHistory: [purchaseRecord, ...settings.purchaseHistory], // 最新を先頭に
    };

    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    set({ settings: newSettings });
    console.log(`[Credits] Added ${credits} credits. New balance: ${newSettings.tokenBalance.credits} credits`);
  },

  /**
   * クレジットを各モデルにトークンとして配分
   * @param allocations 配分先のモデルとクレジット額の配列
   * @throws クレジット不足、容量制限超過の場合はエラー
   */
  allocateCredits: async (allocations: Array<{ modelId: string; credits: number }>) => {
    const { settings, getTotalTokensByCategory } = get();

    // 合計クレジット額を計算
    const totalCreditsToAllocate = allocations.reduce((sum, a) => sum + a.credits, 0);

    // クレジット残高をチェック
    if (totalCreditsToAllocate > settings.tokenBalance.credits) {
      throw new Error(
        `クレジットが不足しています。必要: ${totalCreditsToAllocate}円、残高: ${settings.tokenBalance.credits}円`
      );
    }

    // 容量制限をチェック + トークン数を計算
    const newAllocatedTokens = { ...settings.tokenBalance.allocatedTokens };
    const { creditsToTokens, getTokenPrice, getModelCategory } = await import('../billing/constants/tokenPricing');

    for (const { modelId, credits } of allocations) {
      if (credits <= 0) continue;

      const category = getModelCategory(modelId);
      const pricePerMToken = getTokenPrice(modelId);

      if (!pricePerMToken) {
        throw new Error(`モデル ${modelId} の価格情報が見つかりません`);
      }

      // クレジットをトークンに変換
      const tokens = creditsToTokens(modelId, credits);

      // 容量制限をチェック
      const currentTotal = getTotalTokensByCategory(category);
      const currentModelTokens = newAllocatedTokens[modelId] || 0;
      const newCategoryTotal = currentTotal - currentModelTokens + (currentModelTokens + tokens);
      const limit = TOKEN_CAPACITY_LIMITS[category];

      if (newCategoryTotal > limit) {
        const remaining = limit - (currentTotal - currentModelTokens);
        const maxCredits = Math.floor((remaining / 1_000_000) * pricePerMToken);
        throw new Error(
          `容量制限を超えています。${category === 'quick' ? 'Quick' : 'Think'}カテゴリーの上限は${(limit / 1000000).toFixed(1)}Mトークンです。最大${maxCredits}円まで配分できます。`
        );
      }

      // トークンを配分
      newAllocatedTokens[modelId] = (newAllocatedTokens[modelId] || 0) + tokens;
    }

    // クレジットを減算
    const newSettings = {
      ...settings,
      tokenBalance: {
        credits: settings.tokenBalance.credits - totalCreditsToAllocate,
        allocatedTokens: newAllocatedTokens,
      },
    };

    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    set({ settings: newSettings });
    console.log(`[Credits] Allocated ${totalCreditsToAllocate} credits. Remaining: ${newSettings.tokenBalance.credits} credits`);
  },

  /**
   * トークンを消費（LLM使用時に呼び出される）
   * @param modelId 消費対象のモデルID（例: "gemini-2.5-flash"）
   * @param tokens 消費するトークン数
   */
  deductTokens: async (modelId: string, tokens: number) => {
    const { settings } = get();
    const currentBalance = settings.tokenBalance.allocatedTokens[modelId] || 0;
    const newBalance = Math.max(0, currentBalance - tokens);

    const newSettings = {
      ...settings,
      tokenBalance: {
        ...settings.tokenBalance,
        allocatedTokens: {
          ...settings.tokenBalance.allocatedTokens,
          [modelId]: newBalance,
        },
      },
    };

    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    set({ settings: newSettings });
    console.log(`[TokenBalance] Deducted ${tokens} tokens from ${modelId}. New balance: ${newBalance}`);
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
    };

    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    set({ settings: newSettings });
    console.log(`[ModelLoading] Loaded ${modelId} into ${category} slot`);
  },

  /**
   * 購入履歴を取得
   */
  getPurchaseHistory: () => {
    return get().settings.purchaseHistory;
  },

  /**
   * トークン残高と使用量をリセット（デバッグ用）
   */
  resetTokensAndUsage: async () => {
    const { settings } = get();
    const newSettings = {
      ...settings,
      tokenBalance: {
        credits: 0,
        allocatedTokens: {
          'gemini-2.5-flash': 0,
          'gemini-2.5-pro': 0,
        },
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
    console.log('[Debug] Token balance, credits, and usage reset');
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