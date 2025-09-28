export interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

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

export interface LLMProvider {
  name: string;
  defaultModel: string;
  models: string[];
  status: 'available' | 'unavailable' | 'error';
}

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

export interface LLMResponse {
  message: string;
  response?: string;
  commands?: LLMCommand[];
  provider?: string;
  model?: string;
  historyCount?: number;
  shouldSuggestNewChat?: boolean;
  warning?: string;
}

export interface LLMHealthStatus {
  status: 'ok' | 'error';
  providers: Record<string, LLMProvider>;
}

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
    try {
      // 会話履歴をコンテキストに追加
      const enrichedContext = {
        ...context,
        conversationHistory: this.conversationHistory.getHistory()
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.apiTimeout);

      const response = await fetch(`${this.config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          provider: this.currentProvider,
          model: this.currentModel,
          context: enrichedContext
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new LLMError(
          `HTTP error! status: ${response.status}`,
          'HTTP_ERROR',
          response.status
        );
      }

      const data: LLMResponse = await response.json();

      // コマンドの検証
      if (data.commands) {
        data.commands.forEach(CommandValidator.validate);
      }

      // 会話履歴に追加
      this.conversationHistory.addExchange(
        message,
        data.message || data.response || ''
      );

      return data;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new LLMError('ネットワークエラーが発生しました', 'NETWORK_ERROR');
      }

      throw new LLMError(
        `予期しないエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        'UNKNOWN_ERROR'
      );
    }
  }

  async loadProviders(): Promise<Record<string, LLMProvider>> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/llm-providers`);
      if (!response.ok) {
        throw new LLMError(`HTTP error! status: ${response.status}`, 'HTTP_ERROR', response.status);
      }

      this.availableProviders = await response.json();

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
      const response = await fetch(`${this.config.baseUrl}/api/health`);
      return await response.json();
    } catch (error) {
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
