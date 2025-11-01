/**
 * @file index.ts
 * @summary ChatServiceクラスを提供します
 * @responsibility アプリケーション全体でチャットの状態を一元的に管理し、
 *                 画面とチャット機能を疎結合にするためのサービス層を提供します
 */

import APIService, { ChatContext } from './llmService/api';
import { ChatMessage, LLMCommand } from './llmService/types/types';
import { logger } from '../../utils/logger';
import { ActiveScreenContextProvider, ActiveScreenContext, ChatServiceListener } from './types';
import { FileRepository } from '@data/repositories/fileRepository';
import WebSocketService from './services/websocketService';
import { getOrCreateClientId } from './utils/clientId';
import { useSettingsStore } from '../../settings/settingsStore';

/**
 * シングルトンクラスとして機能し、アプリケーション全体でチャットの状態を管理します。
 * 各画面は ActiveScreenContextProvider を実装し、このサービスに登録することで、
 * 疎結合な形で画面コンテキストをLLMと共有できます。
 */
class ChatService {
  private static instance: ChatService | null = null;

  // 現在アクティブなコンテキストプロバイダー
  private currentProvider: ActiveScreenContextProvider | null = null;

  // グローバルハンドラのマップ（画面に依存しない、起動時に一度だけ登録）
  private globalHandlers: Record<string, (command: LLMCommand) => void | Promise<void>> = {};

  // コンテキストハンドラのマップ（画面依存、画面遷移時に更新）
  private contextHandlers: Record<string, (command: LLMCommand) => void | Promise<void>> = {};

  // チャットメッセージの履歴
  private messages: ChatMessage[] = [];

  // ローディング状態
  private isLoading: boolean = false;

  // リスナー（購読者）のマップ
  private listeners: Map<string, ChatServiceListener> = new Map();

  // LLMプロバイダーとモデル
  private llmProvider: string = 'anthropic';
  private llmModel: string = 'claude-3-5-sonnet-20241022';

  // WebSocketサービス
  private wsService: WebSocketService | null = null;
  private clientId: string | null = null;
  private isWebSocketInitialized: boolean = false;

  // 添付ファイル
  private attachedFile: { filename: string; content: string } | null = null;

  private constructor() {
    // プライベートコンストラクタでシングルトンを保証
  }

  /**
   * ChatServiceのインスタンスを取得
   */
  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  /**
   * アクティブなコンテキストプロバイダーを登録
   * @param provider 登録するコンテキストプロバイダー
   * @param clearHandlers コンテキストハンドラをクリアするかどうか（デフォルト: false）
   */
  public registerActiveContextProvider(provider: ActiveScreenContextProvider, clearHandlers: boolean = false): void {
    logger.debug('chatService', 'Registering active context provider', { clearHandlers });
    this.currentProvider = provider;
    // clearHandlers=trueの場合のみコンテキストハンドラをクリア
    // これにより、画面間でハンドラが保持される（デフォルト動作）
    if (clearHandlers) {
      this.contextHandlers = {};
    }
  }

  /**
   * アクティブなコンテキストプロバイダーを解除
   * Note: コンテキストハンドラはクリアしません。
   * ハンドラは画面間で共有され、各画面が必要なハンドラを上書きします。
   */
  public unregisterActiveContextProvider(): void {
    logger.debug('chatService', 'Unregistering active context provider');
    this.currentProvider = null;
    // コンテキストハンドラはクリアしない - 次の画面で使用される可能性がある
  }

  /**
   * グローバルコマンドハンドラを登録（画面に依存しない）
   * 起動時に一度だけ呼び出されることを想定
   * @param handlers コマンド名をキーとしたハンドラのマップ
   */
  public registerGlobalHandlers(handlers: Record<string, (command: LLMCommand) => void | Promise<void>>): void {
    logger.debug('chatService', 'Registering global command handlers:', Object.keys(handlers));
    this.globalHandlers = { ...this.globalHandlers, ...handlers };
  }

  /**
   * コンテキスト依存のコマンドハンドラを登録（画面遷移時に更新）
   * @param handlers コマンド名をキーとしたハンドラのマップ
   */
  public registerCommandHandlers(handlers: Record<string, (command: LLMCommand) => void | Promise<void>>): void {
    logger.debug('chatService', 'Registering context command handlers:', Object.keys(handlers));
    this.contextHandlers = { ...this.contextHandlers, ...handlers };
  }

  /**
   * LLMプロバイダーとモデルを設定
   */
  public setLLMConfig(provider: string, model: string): void {
    this.llmProvider = provider;
    this.llmModel = model;
  }

  /**
   * WebSocket接続を初期化
   *
   * アプリ起動時に一度だけ呼び出されます（初期化タスクから）。
   * client_idを生成し、WebSocketサービスを初期化してバックエンドに接続します。
   *
   * @param backendUrl バックエンドのURL（例: "https://xxxxx.ngrok-free.app"）
   */
  public async initializeWebSocket(backendUrl: string): Promise<void> {
    if (this.isWebSocketInitialized) {
      logger.debug('chatService', 'WebSocket already initialized');
      return;
    }

    try {
      // client_idを取得または生成
      this.clientId = await getOrCreateClientId();
      logger.info('chatService', `WebSocket client_id: ${this.clientId}`);

      // WebSocketサービスを初期化
      this.wsService = WebSocketService.getInstance(this.clientId);

      // WebSocket状態変更リスナーを追加（デバッグ用）
      this.wsService.addStateListener((state) => {
        logger.info('chatService', `WebSocket state changed: ${state}`);
      });

      // WebSocket接続を確立
      this.wsService.connect(backendUrl);

      this.isWebSocketInitialized = true;
      logger.info('chatService', 'WebSocket initialization completed');

    } catch (error) {
      logger.error('chatService', 'Failed to initialize WebSocket:', error);
      throw error;
    }
  }

  /**
   * WebSocket接続を切断
   */
  public disconnectWebSocket(): void {
    if (this.wsService) {
      this.wsService.disconnect();
      this.isWebSocketInitialized = false;
      logger.info('chatService', 'WebSocket disconnected');
    }
  }

  /**
   * client_idを取得
   */
  public getClientId(): string | null {
    return this.clientId;
  }

  /**
   * ファイルをチャットに添付
   * @param fileId 添付するファイルのID
   */
  public async attachFile(fileId: string): Promise<void> {
    try {
      const file = await FileRepository.getById(fileId);
      if (!file) {
        logger.error('chatService', `File not found: ${fileId}`);
        return;
      }

      this.attachedFile = {
        filename: file.title,
        content: file.content,
      };

      logger.info('chatService', `File attached: ${file.title}`);
      this.notifyAttachedFileChange();
    } catch (error) {
      logger.error('chatService', 'Error attaching file:', error);
    }
  }

  /**
   * 添付ファイルをクリア
   */
  public clearAttachedFile(): void {
    this.attachedFile = null;
    logger.info('chatService', 'Attached file cleared');
    this.notifyAttachedFileChange();
  }

  /**
   * 現在の添付ファイルを取得
   */
  public getAttachedFile(): { filename: string; content: string } | null {
    return this.attachedFile;
  }

  /**
   * チャットメッセージを送信
   * @param message 送信するメッセージ
   */
  public async sendMessage(message: string): Promise<void> {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || this.isLoading) {
      logger.debug('chatService', 'sendMessage aborted (empty message or loading)');
      return;
    }

    // ユーザーメッセージを追加（添付ファイル情報を含める）
    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
      attachedFile: this.attachedFile ?? undefined,
    };
    this.addMessage(userMessage);
    this.setLoading(true);

    try {
      // 現在のコンテキストプロバイダーから画面コンテキストを取得
      let screenContext: ActiveScreenContext | null = null;
      if (this.currentProvider) {
        screenContext = await this.currentProvider.getScreenContext();
        logger.debug('chatService', 'Screen context retrieved:', screenContext);
      }

      // ChatContextを構築
      const chatContext: ChatContext = await this.buildChatContext(screenContext);

      // LLMの設定を適用
      APIService.setLLMProvider(this.llmProvider);
      APIService.setLLMModel(this.llmModel);

      // WebSocket接続状態をログに出力（デバッグ用）
      if (this.wsService) {
        logger.info('chatService', `WebSocket state before sending message: ${this.wsService.getState()}`);
      }

      // APIにメッセージを送信（client_idと添付ファイル情報も含める）
      logger.debug('chatService', 'Sending message to LLM with context:', chatContext);
      const response = await APIService.sendChatMessage(trimmedMessage, chatContext, this.clientId, this.attachedFile ?? undefined);

      // AIメッセージを追加
      const aiMessage: ChatMessage = {
        role: 'ai',
        content: response.message || '',
        timestamp: new Date(),
      };
      this.addMessage(aiMessage);

      // コマンドの処理
      if (response.commands && response.commands.length > 0) {
        logger.debug('chatService', 'Commands received from LLM:', response.commands);
        await this.dispatchCommands(response.commands);
      }

      // 警告メッセージの処理
      if (response.warning) {
        const warningMessage: ChatMessage = {
          role: 'system',
          content: `⚠️ ${response.warning}`,
          timestamp: new Date(),
        };
        this.addMessage(warningMessage);
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      this.setLoading(false);
      // メッセージ送信後に添付ファイルをクリア
      if (this.attachedFile) {
        this.clearAttachedFile();
      }
    }
  }

  /**
   * チャット履歴をリセット
   */
  public resetChat(): void {
    logger.debug('chatService', 'Resetting chat history');
    this.messages = [];
    // LLMServiceの会話履歴もクリア
    APIService.clearHistory();
    this.notifyListeners();
  }

  /**
   * 現在のメッセージ履歴を取得
   */
  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * 現在のローディング状態を取得
   */
  public getIsLoading(): boolean {
    return this.isLoading;
  }

  /**
   * リスナーを登録
   * @param id リスナーの識別子
   * @param listener リスナー
   */
  public subscribe(id: string, listener: ChatServiceListener): void {
    this.listeners.set(id, listener);
  }

  /**
   * リスナーを解除
   * @param id リスナーの識別子
   */
  public unsubscribe(id: string): void {
    this.listeners.delete(id);
  }

  // ===== プライベートメソッド =====

  /**
   * メッセージを追加
   */
  private addMessage(message: ChatMessage): void {
    logger.debug('chatService', 'Adding message:', message);
    this.messages = [...this.messages, message];
    this.notifyListeners();
  }

  /**
   * ローディング状態を設定
   */
  private setLoading(loading: boolean): void {
    this.isLoading = loading;
    this.notifyLoadingChange();
  }

  /**
   * 画面コンテキストからChatContextを構築
   */
  private async buildChatContext(screenContext: ActiveScreenContext | null): Promise<ChatContext> {
    // 設定を取得
    const { settings } = useSettingsStore.getState();

    // sendFileContextToLLMがtrueの場合のみ全ファイル情報を取得
    const allFilesData = settings.sendFileContextToLLM
      ? await this.getAllFilesForContext()
      : undefined;

    const chatContext: ChatContext = {
      activeScreen: screenContext ?? undefined,
      allFiles: allFilesData,
      sendFileContextToLLM: settings.sendFileContextToLLM,
      attachedFileContent: this.attachedFile ?? undefined,
    };
    return chatContext;
  }

  /**
   * LLMコンテキスト用に全ファイル情報を取得（Flat構造版）
   * フラット構造: パス不要、titleのみでファイルを識別
   */
  private async getAllFilesForContext(): Promise<Array<{
    title: string;
    type: 'file';
    category?: string;
    tags?: string[];
  }>> {
    try {
      const files = await FileRepository.getAll();
      return files.map(file => ({
        title: file.title,
        type: 'file' as const,
        category: file.category,
        tags: file.tags,
      }));
    } catch (error) {
      logger.error('chatService', 'Error getting all files for context:', error);
      return [];
    }
  }

  /**
   * コマンドをディスパッチ
   * グローバルハンドラとコンテキストハンドラの両方をチェック
   */
  private async dispatchCommands(commands: LLMCommand[]): Promise<void> {
    for (const command of commands) {
      // コンテキストハンドラを優先、なければグローバルハンドラを使用
      const handler = this.contextHandlers[command.action] || this.globalHandlers[command.action];

      if (handler) {
        try {
          await handler(command);
          logger.debug('chatService', `Command ${command.action} executed successfully`);
        } catch (error) {
          logger.error('chatService', `Error executing command ${command.action}:`, error);
        }
      } else {
        logger.warn('chatService', `No handler found for command: ${command.action}`);
      }
    }
  }

  /**
   * エラーを処理
   */
  private handleError(error: unknown): void {
    logger.error('chatService', 'Error occurred:', error);
    console.error('Chat error:', error);

    let errorMessageContent = '不明なエラーが発生しました。\n\nサーバーが起動していることを確認してください。';

    if (error instanceof Error) {
      errorMessageContent = `❌ エラーが発生しました: ${error.message}\n\nサーバーが起動していることを確認してください。`;
    }

    const errorMessage: ChatMessage = {
      role: 'system',
      content: errorMessageContent,
      timestamp: new Date(),
    };
    this.addMessage(errorMessage);
  }

  /**
   * リスナーに通知
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      if (listener.onMessagesUpdate) {
        listener.onMessagesUpdate(this.messages);
      }
    });
  }

  /**
   * ローディング状態の変更を通知
   */
  private notifyLoadingChange(): void {
    this.listeners.forEach((listener) => {
      if (listener.onLoadingChange) {
        listener.onLoadingChange(this.isLoading);
      }
    });
  }

  /**
   * 添付ファイルの変更を通知
   */
  private notifyAttachedFileChange(): void {
    this.listeners.forEach((listener) => {
      if (listener.onAttachedFileChange) {
        listener.onAttachedFileChange(this.attachedFile);
      }
    });
  }
}

// シングルトンインスタンスをエクスポート
export default ChatService.getInstance();
