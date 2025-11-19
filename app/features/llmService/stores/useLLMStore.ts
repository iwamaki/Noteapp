/**
 * @file useLLMStore.ts
 * @summary LLMプロバイダー・モデル情報を管理するZustand Store
 * @description
 * LLMプロバイダーとモデルの状態を一元管理し、
 * 複数コンポーネントから簡単にアクセスできるようにします。
 * @responsibility プロバイダー情報のロード、キャッシュ、現在のプロバイダー/モデルの管理
 */

import { create } from 'zustand';
import { logger } from '../../../utils/logger';
import { createHttpClient } from '../../api';
import { CHAT_CONFIG } from '../../chat/config/chatConfig';
import type { LLMProvider } from '../types/provider.types';
import { LLMError } from '../types/LLMError';
import { getModelCategoryFromId } from '../utils/modelCategoryHelper';

// =============================================================================
// Types
// =============================================================================

/**
 * LLMストアの状態
 */
interface LLMState {
  // プロバイダー情報
  availableProviders: Record<string, LLMProvider> | null;
  isLoadingProviders: boolean;
  loadingPromise: Promise<void> | null;

  // 現在のプロバイダー・モデル
  currentProvider: string;
  currentModel: string;

  // HTTPクライアント（内部用）
  httpClient: ReturnType<typeof createHttpClient>;
}

/**
 * LLMストアのアクション
 */
interface LLMActions {
  // プロバイダー操作
  loadProviders: () => Promise<void>;
  refreshProviders: () => void;
  getCachedProviders: () => Record<string, LLMProvider> | null;

  // プロバイダー・モデル設定
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  getCurrentProvider: () => string;
  getCurrentModel: () => string;
  getAvailableProviders: () => Record<string, LLMProvider>;

  // ユーティリティ
  getModelCategory: (modelId: string) => 'quick' | 'think';
  isProviderAvailable: (provider: string) => boolean;
  isModelAvailable: (model: string) => boolean;
}

/**
 * ストアの型定義
 */
type LLMStore = LLMState & LLMActions;

// =============================================================================
// Store
// =============================================================================

/**
 * LLMプロバイダー・モデル管理用のZustand Store
 */
export const useLLMStore = create<LLMStore>((set, get) => ({
  // ===== 初期状態 =====
  availableProviders: null,
  isLoadingProviders: false,
  loadingPromise: null,

  currentProvider: CHAT_CONFIG.llm.defaultProvider,
  currentModel: CHAT_CONFIG.llm.defaultModel,

  httpClient: createHttpClient({
    baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000',
    timeout: CHAT_CONFIG.llm.apiTimeout,
    includeAuth: true,
    logContext: 'llm',
  }),

  // ===== プロバイダー操作 =====

  /**
   * プロバイダー情報をAPIから取得してキャッシュ
   */
  loadProviders: async () => {
    const state = get();

    // 既にキャッシュがあれば返す
    if (state.availableProviders) {
      logger.debug('llm', 'Returning cached LLM providers');
      return;
    }

    // 既にロード中なら同じPromiseを返す（重複リクエスト防止）
    if (state.loadingPromise) {
      logger.debug('llm', 'LLM providers already loading, waiting for existing promise');
      return state.loadingPromise;
    }

    // ロード開始
    logger.info('llm', 'Loading LLM providers from API');

    const loadingPromise = (async () => {
      set({ isLoadingProviders: true });

      try {
        const response = await state.httpClient.get('/api/llm-providers');
        const providers: Record<string, LLMProvider> = response.data;

        logger.info('llm', `Loaded ${Object.keys(providers).length} LLM providers`);
        set({ availableProviders: providers });

        // デフォルトモデルを設定（プロバイダーが利用可能な場合）
        if (!state.currentModel && providers[state.currentProvider]) {
          set({ currentModel: providers[state.currentProvider].defaultModel });
        }
      } catch (error) {
        logger.error('llm', 'Failed to load LLM providers:', error);
        if (error instanceof LLMError) {
          throw error;
        }
        throw new LLMError('プロバイダー読み込みに失敗しました', 'PROVIDER_LOAD_ERROR');
      } finally {
        set({ isLoadingProviders: false, loadingPromise: null });
      }
    })();

    set({ loadingPromise });
    return loadingPromise;
  },

  /**
   * キャッシュをクリアして再読み込みを強制
   */
  refreshProviders: () => {
    logger.info('llm', 'Clearing LLM providers cache');
    set({ availableProviders: null });
  },

  /**
   * キャッシュされたプロバイダー情報を同期的に取得
   */
  getCachedProviders: () => {
    return get().availableProviders;
  },

  // ===== プロバイダー・モデル設定 =====

  /**
   * 現在のプロバイダーを設定
   */
  setProvider: (provider: string) => {
    const state = get();

    // プロバイダーが実際に変更された場合のみデフォルトモデルを設定
    if (state.currentProvider !== provider) {
      logger.info('llm', `Setting provider to: ${provider}`);
      set({ currentProvider: provider });

      // プロバイダーが利用可能な場合、デフォルトモデルを設定
      if (state.availableProviders?.[provider]) {
        const defaultModel = state.availableProviders[provider].defaultModel;
        logger.info('llm', `Setting model to default: ${defaultModel}`);
        set({ currentModel: defaultModel });
      }
    }
  },

  /**
   * 現在のモデルを設定
   */
  setModel: (model: string) => {
    logger.info('llm', `Setting model to: ${model}`);
    set({ currentModel: model });
  },

  /**
   * 現在のプロバイダーを取得
   */
  getCurrentProvider: () => {
    return get().currentProvider;
  },

  /**
   * 現在のモデルを取得
   */
  getCurrentModel: () => {
    return get().currentModel;
  },

  /**
   * 利用可能なプロバイダー一覧を取得
   */
  getAvailableProviders: () => {
    return get().availableProviders || {};
  },

  // ===== ユーティリティ =====

  /**
   * モデルIDからカテゴリー（quick/think）を取得
   */
  getModelCategory: (modelId: string): 'quick' | 'think' => {
    const providers = get().availableProviders;
    return getModelCategoryFromId(modelId, providers);
  },

  /**
   * 指定したプロバイダーが利用可能かチェック
   */
  isProviderAvailable: (provider: string): boolean => {
    const providers = get().availableProviders;
    return !!providers?.[provider];
  },

  /**
   * 指定したモデルが現在のプロバイダーで利用可能かチェック
   */
  isModelAvailable: (model: string): boolean => {
    const state = get();
    const provider = state.availableProviders?.[state.currentProvider];
    return provider ? provider.models.includes(model) : false;
  },
}));
