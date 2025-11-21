/**
 * @file llmService/index.ts
 * @summary LLMサービスのオーケストレーション層
 * @responsibility 各コンポーネントを統合し、LLMサービスの公開APIを提供
 */

import { logger } from '../../utils/logger';
import { createHttpClient, HttpClient, ApiErrorHandler } from '../api';
import type {
  ChatContext,
  LLMProvider,
  LLMResponse,
  LLMHealthStatus,
  LLMConfig,
  ChatMessage,
} from './types/index';
import { LLMError } from './types/LLMError';
import { RequestManager } from './core/RequestManager';
import { SummarizationService } from './services/SummarizationService';
import { CHAT_CONFIG } from '../chat/config/chatConfig';
import { useLLMStore } from './stores/useLLMStore';
import { useConversationStore } from './stores/useConversationStore';

// Re-export types
export type { ChatMessage, ChatContext, LLMProvider, LLMResponse, LLMHealthStatus, LLMConfig, LLMCommand, TokenUsageInfo, SummarizeRequest, SummarizeResponse, SummaryResult } from './types/index';
export { LLMError } from './types/LLMError';
export type { SummarizationResult } from './services/SummarizationService';

// Re-export stores
export { useLLMStore } from './stores/useLLMStore';
export { useConversationStore } from './stores/useConversationStore';

// Re-export services
export { CommandService } from './services/CommandService';

// Re-export core components
export { WebSocketManager } from './core/WebSocketManager';
export type { WebSocketManagerConfig, MessageHandler, WebSocketManagerCallbacks } from './core/WebSocketManager';

/**
 * LLMサービスメインクラス
 *
 * Zustandストアと連携して動作します：
 * - useLLMStore: プロバイダー・モデル情報の管理
 * - useConversationStore: 会話履歴の管理
 */
export class LLMService {
  private config: LLMConfig;
  private httpClient: HttpClient;
  private requestManager: RequestManager;
  private summarizationService: SummarizationService;

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      maxHistorySize: CHAT_CONFIG.llm.maxHistorySize,
      apiTimeout: CHAT_CONFIG.llm.apiTimeout,
      baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000',
      ...config,
    };

    this.httpClient = createHttpClient({
      baseUrl: this.config.baseUrl,
      timeout: this.config.apiTimeout,
      includeAuth: true,
      logContext: 'llm',
    });
    this.requestManager = new RequestManager({
      minRequestInterval: CHAT_CONFIG.llm.minRequestInterval,
    });
    this.summarizationService = new SummarizationService(this.httpClient);
  }

  async sendChatMessage(
    message: string,
    context: ChatContext = {},
    clientId?: string | null,
    attachedFiles?: Array<{ filename: string; content: string }>
  ): Promise<LLMResponse> {
    // Zustandストアから状態を取得
    const llmStore = useLLMStore.getState();
    const conversationStore = useConversationStore.getState();

    // リクエストを開始（レート制限を適用）
    const requestId = await this.requestManager.startRequest();

    try {
      // 会話履歴をコンテキストに追加
      const history = conversationStore.getHistory().map(msg => ({
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
        provider: llmStore.getCurrentProvider(),
        model: llmStore.getCurrentModel(),
        contextKeys: Object.keys(enrichedContext),
        historyLength: history.length,
        clientId: clientId || 'none',
      });

      // HTTPリクエストを送信（client_idを含める）
      const payload: any = {
        message,
        provider: llmStore.getCurrentProvider(),
        model: llmStore.getCurrentModel(),
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

      // 会話履歴に追加（ストア経由）
      conversationStore.addExchange(
        message,
        data.message,
        attachedFiles
      );

      logger.info('llm', `Request #${requestId} - Successfully completed`);
      return data;
    } catch (error) {
      // エラーをログ記録
      logger.error('llm', `Request #${requestId} - Error occurred:`, error);

      // 既にLLMErrorの場合はそのままスロー
      if (error instanceof LLMError) {
        throw error;
      }

      // タイムアウトエラー
      if (error instanceof Error && error.message === 'TIMEOUT') {
        throw new LLMError(
          `リクエストがタイムアウトしました (${this.config.apiTimeout / 1000}秒)`,
          'TIMEOUT_ERROR'
        );
      }

      // 共通エラーハンドラーを使用してApiErrorに変換し、LLMErrorに変換
      const errorHandler = new ApiErrorHandler('llm');
      const apiError = errorHandler.handle(error);

      throw new LLMError(
        apiError.message,
        apiError.code || 'UNKNOWN_ERROR',
        apiError.status
      );
    } finally {
      // リクエストを終了
      this.requestManager.endRequest(requestId);
    }
  }

  /**
   * プロバイダー情報をロード（ストアに委譲）
   */
  async loadProviders(): Promise<Record<string, LLMProvider>> {
    const llmStore = useLLMStore.getState();
    await llmStore.loadProviders();
    return llmStore.getAvailableProviders();
  }

  /**
   * キャッシュされたLLMプロバイダーを同期的に取得（ストアから）
   */
  getCachedProviders(): Record<string, LLMProvider> | null {
    return useLLMStore.getState().getCachedProviders();
  }

  /**
   * キャッシュをクリアして再読み込みを強制（ストアに委譲）
   */
  refreshProviders(): void {
    useLLMStore.getState().refreshProviders();
  }

  async checkHealth(): Promise<LLMHealthStatus> {
    try {
      const response = await this.httpClient.get('/api/health');
      return response.data;
    } catch {
      return { status: 'error', providers: {} };
    }
  }

  /**
   * プロバイダーを設定（ストアに委譲）
   */
  setProvider(provider: string): void {
    useLLMStore.getState().setProvider(provider);
  }

  /**
   * モデルを設定（ストアに委譲）
   */
  setModel(model: string): void {
    useLLMStore.getState().setModel(model);
  }

  /**
   * 現在のプロバイダーを取得（ストアから）
   */
  getCurrentProvider(): string {
    return useLLMStore.getState().getCurrentProvider();
  }

  /**
   * 現在のモデルを取得（ストアから）
   */
  getCurrentModel(): string {
    return useLLMStore.getState().getCurrentModel();
  }

  /**
   * 利用可能なプロバイダーを取得（ストアから）
   */
  getAvailableProviders(): Record<string, LLMProvider> {
    return useLLMStore.getState().getAvailableProviders();
  }

  /**
   * 会話履歴を取得（ストアから）
   */
  getConversationHistory(): ChatMessage[] {
    return useConversationStore.getState().getHistory();
  }

  /**
   * 会話履歴をクリア（ストアに委譲）
   */
  clearHistory(): void {
    useConversationStore.getState().clear();
  }

  /**
   * 会話履歴を要約する（ストアと連携）
   * @param currentMessages 現在のメッセージ履歴（UI用）
   * @returns 要約結果と圧縮された会話履歴
   */
  async summarizeConversation(currentMessages: ChatMessage[]): Promise<import('./services/SummarizationService').SummarizationResult> {
    const llmStore = useLLMStore.getState();
    const conversationStore = useConversationStore.getState();

    return this.summarizationService.summarizeConversation(
      conversationStore,
      currentMessages,
      llmStore.getCurrentProvider(),
      llmStore.getCurrentModel()
    );
  }


  /**
   * テキストを知識ベースにアップロード
   * @param text アップロードするテキスト
   * @param collectionName コレクション名（デフォルト: "default"）
   * @param metadataTitle ドキュメントのタイトル（オプション）
   * @param metadataDescription ドキュメントの説明（オプション）
   * @returns アップロード結果
   */
  async uploadTextToKnowledgeBase(
    text: string,
    collectionName: string = 'default',
    metadataTitle?: string,
    metadataDescription?: string
  ): Promise<{
    success: boolean;
    message: string;
    document?: {
      chunks_created: number;
      total_characters: number;
      average_chunk_size: number;
    };
    knowledge_base?: {
      total_documents: number;
      collection_name: string;
    };
  }> {
    const params: Record<string, string> = {
      collection_name: collectionName,
    };
    if (metadataTitle) params.metadata_title = metadataTitle;
    if (metadataDescription) params.metadata_description = metadataDescription;

    const response = await this.httpClient.post('/api/knowledge-base/documents/upload-text',
      { text },
      { params }
    );

    return response.data;
  }
}
