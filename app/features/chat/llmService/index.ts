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
  SummarizeRequest,
  SummarizeResponse,
  ChatMessage,
  DocumentSummarizeRequest,
  DocumentSummarizeResponse,
} from './types/types';
import { LLMError } from './types/LLMError';
import { ConversationHistory } from './core/ConversationHistory';
import { HttpClient } from './utils/HttpClient';
import { RequestManager } from './core/RequestManager';
import { ErrorHandler } from './utils/ErrorHandler';
import { ProviderManager } from './core/ProviderManager';
import { CHAT_CONFIG } from '../config/chatConfig';

// Re-export types
export type { ChatMessage, ChatContext, LLMProvider, LLMResponse, LLMHealthStatus, LLMConfig, LLMCommand, TokenUsageInfo, SummarizeRequest, SummarizeResponse, SummaryResult, DocumentSummarizeRequest, DocumentSummarizeResponse } from './types/types';
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
      maxHistorySize: CHAT_CONFIG.llm.maxHistorySize,
      apiTimeout: CHAT_CONFIG.llm.apiTimeout,
      baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000',
      ...config,
    };

    this.conversationHistory = new ConversationHistory(this.config.maxHistorySize);
    this.httpClient = new HttpClient({
      baseUrl: this.config.baseUrl,
      timeout: this.config.apiTimeout,
    });
    this.requestManager = new RequestManager({
      minRequestInterval: CHAT_CONFIG.llm.minRequestInterval,
    });
    this.providerManager = new ProviderManager({
      defaultProvider: CHAT_CONFIG.llm.defaultProvider,
      defaultModel: CHAT_CONFIG.llm.defaultModel,
    });
  }

  async sendChatMessage(
    message: string,
    context: ChatContext = {},
    clientId?: string | null,
    attachedFiles?: Array<{ filename: string; content: string }>
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
        attachedFiles
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

  /**
   * 会話履歴を要約する
   * @returns 要約結果と圧縮された会話履歴
   */
  async summarizeConversation(): Promise<SummarizeResponse> {
    try {
      // 現在の会話履歴を取得
      const history = this.conversationHistory.getHistory().map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }));

      if (history.length === 0) {
        throw new LLMError('会話履歴が空です', 'EMPTY_HISTORY');
      }

      logger.info('llm', `Summarizing conversation with ${history.length} messages`);

      // 要約リクエストを送信
      const request: SummarizeRequest = {
        conversationHistory: history,
        provider: this.providerManager.getCurrentProvider(),
        model: this.providerManager.getCurrentModel(),
      };

      const response = await this.httpClient.post('/api/chat/summarize', request);

      if (response.status < 200 || response.status >= 300) {
        throw new LLMError(
          `HTTP error! status: ${response.status}`,
          'HTTP_ERROR',
          response.status
        );
      }

      const data: SummarizeResponse = response.data;

      // 会話履歴を要約結果で置き換える
      this.conversationHistory.clear();

      // システムメッセージ（要約）を追加
      const summaryMessage: ChatMessage = {
        role: 'system',
        content: data.summary.content,
        timestamp: data.summary.timestamp ? new Date(data.summary.timestamp) : new Date(),
      };
      this.conversationHistory.addMessage(summaryMessage);

      // 最近のメッセージを復元
      data.recentMessages.forEach((msg) => {
        const message: ChatMessage = {
          role: msg.role as 'user' | 'ai' | 'system',
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        };
        this.conversationHistory.addMessage(message);
      });

      logger.info('llm', `Conversation summarized: ${data.originalTokens} -> ${data.compressedTokens} tokens (${(data.compressionRatio * 100).toFixed(1)}% reduction)`);

      return data;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError('要約の作成に失敗しました', 'SUMMARIZATION_ERROR');
    }
  }

  /**
   * 文書内容を要約する
   * @param content 文書の内容
   * @param title 文書のタイトル
   * @returns 要約レスポンス（要約テキストとトークン情報）
   */
  async summarizeDocument(
    content: string,
    title: string
  ): Promise<DocumentSummarizeResponse> {
    try {
      logger.info('llm', `Summarizing document: title="${title}", content_length=${content.length}`);

      // 要約リクエストを送信
      const request: DocumentSummarizeRequest = {
        content,
        title,
        provider: this.providerManager.getCurrentProvider(),
        model: this.providerManager.getCurrentModel(),
      };

      const response = await this.httpClient.post('/api/document/summarize', request);

      if (response.status < 200 || response.status >= 300) {
        throw new LLMError(
          `HTTP error! status: ${response.status}`,
          'HTTP_ERROR',
          response.status
        );
      }

      const data: DocumentSummarizeResponse = response.data;

      logger.info('llm', `Document summarization complete: ${data.summary.substring(0, 100)}... (tokens: input=${data.inputTokens}, output=${data.outputTokens})`);

      return data;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      logger.error('llm', 'Failed to summarize document:', error);
      throw new LLMError('文書要約の作成に失敗しました', 'DOCUMENT_SUMMARIZATION_ERROR');
    }
  }
}
