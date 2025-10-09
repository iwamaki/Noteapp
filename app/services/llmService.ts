/**
 * @file llmService.ts
 * @summary このファイルは、LLM（大規模言語モデル）サービスとの連携に必要な型定義、ユーティリティ、および主要なサービスロジックを提供します。
 * 会話履歴の管理、LLMコマンドの検証、およびバックエンドAPIとの通信を担当します。
 * @responsibility LLM関連のデータ構造の定義、会話のライフサイクル管理、APIリクエストの送信とレスポンス処理、エラーハンドリング、およびLLMプロバイダーとモデルの設定と管理を行います。
 */

import axios from 'axios';
import { loggerConfig } from '../utils/loggerConfig';

// LLMサービス関連の型定義とユーティリティ関数
export interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

// チャットコンテキスト
export interface ChatContext {
  currentPath?: string;
  fileList?: Array<{
    name: string;
    type: string;
    size?: string;
    hasContent?: boolean;
  }>;
  currentFile?: string;
  currentFileContent?: {
    filename: string;
    content: string;
    size: string;
    type: string;
  };
  attachedFileContent?: {
    filename: string;
    content: string;
  };
  isEditMode?: boolean;
  selectedFiles?: string[];
  timestamp?: string;
  openFileInfo?: string;
  customPrompt?: {
    id: string;
    name: string;
    content: string;
    description?: string;
    enabled: boolean;
    createdAt: Date;
  };
  conversationHistory?: ChatMessage[];
}

// LLMプロバイダー情報
export interface LLMProvider {
  name: string;
  defaultModel: string;
  models: string[];
  status: 'available' | 'unavailable' | 'error';
}

// LLMコマンド
export interface LLMCommand {
  action: string;
  path?: string;
  content?: string;
  description?: string;
  source?: string;
  destination?: string;
  paths?: string[];
  sources?: string[];
}

// LLMレスポンス
export interface LLMResponse {
  message: string;
  commands?: LLMCommand[];
  provider?: string;
  model?: string;
  historyCount?: number;
  shouldSuggestNewChat?: boolean;
  warning?: string;
}

// LLMヘルスステータス
export interface LLMHealthStatus {
  status: 'ok' | 'error';
  providers: Record<string, LLMProvider>;
}

// LLM設定
export interface LLMConfig {
  maxHistorySize: number;
  apiTimeout: number;
  baseUrl: string;
}

// エラークラス
export class LLMError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * 会話履歴管理クラス（インスタンス化対応）
 */
export class ConversationHistory {
  private history: ChatMessage[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  addMessage(message: ChatMessage): void {
    this.history.push(message);
    this.trimHistory();
  }

  addExchange(userMessage: string, aiResponse: string): void {
    const timestamp = new Date();

    this.addMessage({
      role: 'user',
      content: userMessage,
      timestamp
    });

    this.addMessage({
      role: 'ai',
      content: aiResponse,
      timestamp
    });
  }

  clear(): void {
    this.history = [];
  }

  getHistoryStatus(): { count: number; totalChars: number } {
    const totalChars = this.history.reduce((sum, msg) => sum + msg.content.length, 0);
    return {
      count: this.history.length,
      totalChars
    };
  }

  private trimHistory(): void {
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }
}

/**
 * コマンド検証ユーティリティ
 */
export class CommandValidator {
  private static readonly ALLOWED_ACTIONS = [
    'create_file', 'create_directory', 'delete_file', 'copy_file', 'move_file',
    'read_file', 'edit_file', 'list_files',
    'batch_delete', 'batch_copy', 'batch_move'
  ] as const;

  static validate(command: LLMCommand): void {
    if (!command.action) {
      throw new LLMError('アクションが指定されていません', 'MISSING_ACTION');
    }

    if (!this.ALLOWED_ACTIONS.includes(command.action as any)) {
      throw new LLMError(`許可されていないアクション: ${command.action}`, 'INVALID_ACTION');
    }

    // パスの安全性をチェック
    const paths = [command.path, command.source, command.destination].filter(Boolean);
    for (const path of paths) {
      this.validatePath(path!);
    }

    // バッチ操作のパス配列をチェック
    if (command.paths || command.sources) {
      const pathArray = command.paths || command.sources;
      if (!Array.isArray(pathArray)) {
        throw new LLMError('バッチ操作のパスは配列である必要があります', 'INVALID_BATCH_PATHS');
      }
      pathArray.forEach(this.validatePath);
    }
  }

  private static validatePath(path: string): void {
    if (typeof path !== 'string' || path.includes('..')) {
      throw new LLMError(`不正なパス: ${path}`, 'INVALID_PATH');
    }
  }
}

/**
 * LLMサービスメインクラス（インスタンス化対応）
 */
export class LLMService {
  private config: LLMConfig;
  private conversationHistory: ConversationHistory;
  private availableProviders: Record<string, LLMProvider> = {};
  private currentProvider: string;
  private currentModel: string;
  private requestCounter: number = 0;
  private pendingRequests: Set<number> = new Set();
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 100; // 最小リクエスト間隔（ミリ秒）

  constructor(config?: Partial<LLMConfig>) {
    this.config = {
      maxHistorySize: 100,
      apiTimeout: 30000,
      baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000',
      ...config
    };

    this.conversationHistory = new ConversationHistory(this.config.maxHistorySize);
    this.currentProvider = 'openai';
    this.currentModel = 'gpt-3.5-turbo';
  }

  async sendChatMessage(
    message: string,
    context: ChatContext = {}
  ): Promise<LLMResponse> {
    // リクエストIDを生成して追跡
    const requestId = ++this.requestCounter;

    // 前回のリクエストからの経過時間をチェック
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (this.lastRequestTime > 0 && timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      loggerConfig.debug('llm', `Request #${requestId} - Waiting ${delay}ms before sending (rate limiting)`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    // 既存の保留中リクエストがある場合は警告
    if (this.pendingRequests.size > 0) {
      loggerConfig.warn('llm', `Warning: There are ${this.pendingRequests.size} pending requests`);
      // 保留中のリクエストをすべてクリア（タイムアウト扱いにする）
      this.pendingRequests.clear();
    }

    this.pendingRequests.add(requestId);
    this.lastRequestTime = Date.now();
    loggerConfig.info('llm', `Request #${requestId} started. Pending requests: ${this.pendingRequests.size}`);

    // タイムアウトIDを保持してクリーンアップできるようにする
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // 会話履歴をコンテキストに追加（Dateオブジェクトをシリアライズ可能に変換）
      const history = this.conversationHistory.getHistory().map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      }));

      const enrichedContext = {
        ...context,
        conversationHistory: history
      };

      loggerConfig.debug('llm', `Request #${requestId} - About to send request to: ${this.config.baseUrl}/api/chat`);
      loggerConfig.debug('llm', `Request #${requestId} - Payload:`, {
        message,
        provider: this.currentProvider,
        model: this.currentModel,
        contextKeys: Object.keys(enrichedContext),
        historyLength: history.length
      });

      // axiosを使用してリクエストを送信（タイムアウト付き）
      const axiosPromise = axios.post(`${this.config.baseUrl}/api/chat`, {
        message,
        provider: this.currentProvider,
        model: this.currentModel,
        context: enrichedContext
      }, {
        timeout: this.config.apiTimeout,
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(response => {
        loggerConfig.info('llm', `Request #${requestId} - Request completed, status: ${response.status}`);
        // リクエストが成功したらタイムアウトをクリア
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
          loggerConfig.debug('llm', `Request #${requestId} - Timeout cleared (request succeeded)`);
        }
        return response;
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          loggerConfig.warn('llm', `Request #${requestId} - Timeout reached`);
          timeoutId = null;
          reject(new Error('TIMEOUT'));
        }, this.config.apiTimeout);
      });

      const response = await Promise.race([axiosPromise, timeoutPromise]);

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
        data.message
      );

      loggerConfig.info('llm', `Request #${requestId} - Successfully completed`);
      return data;
    } catch (error) {
      loggerConfig.error('llm', `Request #${requestId} - Error occurred:`, error);

      if (error instanceof LLMError) {
        throw error;
      }

      // タイムアウトエラーのハンドリング
      if (error instanceof Error && error.message === 'TIMEOUT') {
        throw new LLMError(
          `リクエストがタイムアウトしました (${this.config.apiTimeout / 1000}秒)`,
          'TIMEOUT_ERROR'
        );
      }

      // Axiosエラーの詳細なハンドリング
      if (axios.isAxiosError(error)) {
        loggerConfig.debug('llm', `Request #${requestId} - Axios error details:`, {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          hasRequest: !!error.request,
          hasResponse: !!error.response
        });

        if (error.code === 'ECONNABORTED') {
          throw new LLMError(
            `リクエストがタイムアウトしました (${this.config.apiTimeout / 1000}秒)`,
            'TIMEOUT_ERROR'
          );
        }

        if (error.response) {
          // サーバーがエラーレスポンスを返した
          throw new LLMError(
            `サーバーエラー: ${error.response.status} - ${error.response.statusText}`,
            'HTTP_ERROR',
            error.response.status
          );
        } else if (error.request) {
          // リクエストは送信されたがレスポンスがない
          throw new LLMError(
            'サーバーから応答がありません。ネットワーク接続を確認してください。',
            'NETWORK_ERROR'
          );
        } else {
          // リクエストの設定中にエラーが発生
          throw new LLMError(
            `リクエストエラー: ${error.message}`,
            'REQUEST_SETUP_ERROR'
          );
        }
      }

      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new LLMError('ネットワークエラーが発生しました', 'NETWORK_ERROR');
      }

      throw new LLMError(
        `予期しないエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        'UNKNOWN_ERROR'
      );
    } finally {
      // タイムアウトが残っていればクリア
      if (timeoutId) {
        clearTimeout(timeoutId);
        loggerConfig.debug('llm', `Request #${requestId} - Timeout cleared in finally`);
      }

      // リクエスト完了後、保留リストから削除
      this.pendingRequests.delete(requestId);
      loggerConfig.debug('llm', `Request #${requestId} - Removed from pending. Remaining: ${this.pendingRequests.size}`);
    }
  }

  async loadProviders(): Promise<Record<string, LLMProvider>> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/llm-providers`);

      this.availableProviders = response.data;

      // デフォルトモデルを設定
      if (!this.currentModel && this.availableProviders[this.currentProvider]) {
        this.currentModel = this.availableProviders[this.currentProvider].defaultModel;
      }

      return this.availableProviders;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError('プロバイダー読み込みに失敗しました', 'PROVIDER_LOAD_ERROR');
    }
  }

  async checkHealth(): Promise<LLMHealthStatus> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/health`);
      return response.data;
    } catch {
      return { status: 'error', providers: {} };
    }
  }

  setProvider(provider: string): void {
    this.currentProvider = provider;

    // プロバイダー変更時にデフォルトモデルを設定
    if (this.availableProviders[provider]) {
      this.currentModel = this.availableProviders[provider].defaultModel;
    }
  }

  setModel(model: string): void {
    this.currentModel = model;
  }

  getCurrentProvider(): string {
    return this.currentProvider;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  getAvailableProviders(): Record<string, LLMProvider> {
    return this.availableProviders;
  }

  getConversationHistory(): ConversationHistory {
    return this.conversationHistory;
  }

  clearHistory(): void {
    this.conversationHistory.clear();
  }
}


// パスユーティリティ
export class PathUtils {
  static joinPath(basePath: string, ...segments: string[]): string {
    let result = basePath.replace(/\/+$/, ''); // 末尾のスラッシュを除去
    for (const segment of segments) {
      if (segment) {
        result += '/' + segment.replace(/^\/+/, ''); // 先頭のスラッシュを除去
      }
    }
    return result || '/';
  }
}
