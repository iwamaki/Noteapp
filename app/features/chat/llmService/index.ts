/**
 * @file llmService/index.ts
 * @summary LLMサービスのオーケストレーション層
 * @responsibility 各コンポーネントを統合し、LLMサービスの公開APIを提供
 */

import { logger } from '../../../utils/logger';
import type {
  ChatContext,
  LLMProvider,
  LLMResponse,
  LLMHealthStatus,
  LLMConfig,
} from './types/types';
import { LLMError } from './types/LLMError';
import { ConversationHistory } from './core/ConversationHistory';
import { HttpClient } from './utils/HttpClient';
import { RequestManager } from './core/RequestManager';
import { ErrorHandler } from './utils/ErrorHandler';
import { ProviderManager } from './core/ProviderManager';

// Re-export types
export type { ChatMessage, ChatContext, LLMProvider, LLMResponse, LLMHealthStatus, LLMConfig, LLMCommand } from './types/types';
export { LLMError } from './types/LLMError';
export { ConversationHistory } from './core/ConversationHistory';

/**
 * LLMサービスメインクラス
 */
export class LLMService {
  private config: LLMConfig;
  private conversationHistory: ConversationHistory;
  private httpClient: HttpClient;
  private requestManager: RequestManager;
  private providerManager: ProviderManager;
  private cachedProviders: Record<string, LLMProvider> | null = null;
  private loadingPromise: Promise<Record<string, LLMProvider>> | null = null;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      maxHistorySize: 100,
      apiTimeout: 30000,
      baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000',
      ...config,
    };

    this.conversationHistory = new ConversationHistory(this.config.maxHistorySize);
    this.httpClient = new HttpClient({
      baseUrl: this.config.baseUrl,
      timeout: this.config.apiTimeout,
    });
    this.requestManager = new RequestManager({
      minRequestInterval: 100,
    });
    this.providerManager = new ProviderManager({
      defaultProvider: 'openai',
      defaultModel: 'gpt-3.5-turbo',
    });
  }

  async sendChatMessage(
    message: string,
    context: ChatContext = {},
    clientId?: string | null,
    attachedFile?: { filename: string; content: string }
  ): Promise<LLMResponse> {
    // リクエストを開始（レート制限を適用）
    const requestId = await this.requestManager.startRequest();

    try {
      // 会話履歴をコンテキストに追加
      const history = this.conversationHistory.getHistory().map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }));

      const enrichedContext = {
        ...context,
        conversationHistory: history,
      };

      logger.debug('llm', `Request #${requestId} - About to send request to: ${this.config.baseUrl}/api/chat`);
      logger.debug('llm', `Request #${requestId} - Payload:`, {
        message,
        provider: this.providerManager.getCurrentProvider(),
        model: this.providerManager.getCurrentModel(),
        contextKeys: Object.keys(enrichedContext),
        historyLength: history.length,
        clientId: clientId || 'none',
      });

      // HTTPリクエストを送信（client_idを含める）
      const payload: any = {
        message,
        provider: this.providerManager.getCurrentProvider(),
        model: this.providerManager.getCurrentModel(),
        context: enrichedContext,
      };

      // client_idがある場合は含める
      if (clientId) {
        payload.client_id = clientId;
      }

      const response = await this.httpClient.post(`/api/chat`, payload);

      logger.info('llm', `Request #${requestId} - Request completed, status: ${response.status}`);

      if (response.status < 200 || response.status >= 300) {
        throw new LLMError(
          `HTTP error! status: ${response.status}`,
          'HTTP_ERROR',
          response.status
        );
      }

      const data: LLMResponse = response.data;

      // 会話履歴に追加
      this.conversationHistory.addExchange(
        message,
        data.message,
        attachedFile
      );

      logger.info('llm', `Request #${requestId} - Successfully completed`);
      return data;
    } catch (error) {
      // エラーハンドリングを委譲
      ErrorHandler.handleError(error, requestId, this.config.apiTimeout);
    } finally {
      // リクエストを終了
      this.requestManager.endRequest(requestId);
    }
  }

  async loadProviders(): Promise<Record<string, LLMProvider>> {
    // 既にキャッシュがあれば返す
    if (this.cachedProviders) {
      logger.debug('llm', 'Returning cached LLM providers');
      return this.cachedProviders;
    }

    // 既にロード中なら同じPromiseを返す（重複リクエスト防止）
    if (this.loadingPromise) {
      logger.debug('llm', 'LLM providers already loading, returning existing promise');
      return this.loadingPromise;
    }

    // ロード開始
    logger.info('llm', 'Loading LLM providers from API');
    this.loadingPromise = this._fetchLLMProviders();

    try {
      this.cachedProviders = await this.loadingPromise;
      return this.cachedProviders;
    } finally {
      this.loadingPromise = null;
    }
  }

  /**
   * LLMプロバイダーを実際に取得する内部メソッド
   */
  private async _fetchLLMProviders(): Promise<Record<string, LLMProvider>> {
    try {
      const response = await this.httpClient.get('/api/llm-providers');
      const providers = response.data;

      this.providerManager.setAvailableProviders(providers);

      return providers;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError('プロバイダー読み込みに失敗しました', 'PROVIDER_LOAD_ERROR');
    }
  }

  /**
   * キャッシュされたLLMプロバイダーを同期的に取得
   * キャッシュがない場合はnullを返す
   */
  getCachedProviders(): Record<string, LLMProvider> | null {
    return this.cachedProviders;
  }

  /**
   * キャッシュをクリアして再読み込みを強制
   */
  refreshProviders(): void {
    logger.info('llm', 'Clearing LLM providers cache');
    this.cachedProviders = null;
  }

  async checkHealth(): Promise<LLMHealthStatus> {
    try {
      const response = await this.httpClient.get('/api/health');
      return response.data;
    } catch {
      return { status: 'error', providers: {} };
    }
  }

  setProvider(provider: string): void {
    this.providerManager.setProvider(provider);
  }

  setModel(model: string): void {
    this.providerManager.setModel(model);
  }

  getCurrentProvider(): string {
    return this.providerManager.getCurrentProvider();
  }

  getCurrentModel(): string {
    return this.providerManager.getCurrentModel();
  }

  getAvailableProviders(): Record<string, LLMProvider> {
    return this.providerManager.getAvailableProviders();
  }

  getConversationHistory(): ConversationHistory {
    return this.conversationHistory;
  }

  clearHistory(): void {
    this.conversationHistory.clear();
  }
}
