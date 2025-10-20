/**
 * @file index.ts
 * @summary ChatServiceクラスを提供します
 * @responsibility アプリケーション全体でチャットの状態を一元的に管理し、
 *                 画面とチャット機能を疎結合にするためのサービス層を提供します
 */

import APIService, { ChatContext } from '../../services/llmService/api';
import { ChatMessage, LLMCommand } from '../../services/llmService/types/types';
import { logger } from '../../utils/logger';
import { ActiveScreenContextProvider, ActiveScreenContext, ChatServiceListener } from './types';

/**
 * シングルトンクラスとして機能し、アプリケーション全体でチャットの状態を管理します。
 * 各画面は ActiveScreenContextProvider を実装し、このサービスに登録することで、
 * 疎結合な形で画面コンテキストをLLMと共有できます。
 */
class ChatService {
  private static instance: ChatService | null = null;

  // 現在アクティブなコンテキストプロバイダー
  private currentProvider: ActiveScreenContextProvider | null = null;

  // コマンドハンドラのマップ
  private commandHandlers: Record<string, (command: LLMCommand) => void | Promise<void>> = {};

  // チャットメッセージの履歴
  private messages: ChatMessage[] = [];

  // ローディング状態
  private isLoading: boolean = false;

  // リスナー（購読者）のマップ
  private listeners: Map<string, ChatServiceListener> = new Map();

  // LLMプロバイダーとモデル
  private llmProvider: string = 'anthropic';
  private llmModel: string = 'claude-3-5-sonnet-20241022';

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
   */
  public registerActiveContextProvider(provider: ActiveScreenContextProvider): void {
    logger.debug('chatService', 'Registering active context provider');
    this.currentProvider = provider;
    // コマンドハンドラをクリア
    this.commandHandlers = {};
  }

  /**
   * アクティブなコンテキストプロバイダーを解除
   */
  public unregisterActiveContextProvider(): void {
    logger.debug('chatService', 'Unregistering active context provider');
    this.currentProvider = null;
    this.commandHandlers = {};
  }

  /**
   * コマンドハンドラを登録
   * @param handlers コマンド名をキーとしたハンドラのマップ
   */
  public registerCommandHandlers(handlers: Record<string, (command: LLMCommand) => void | Promise<void>>): void {
    logger.debug('chatService', 'Registering command handlers:', Object.keys(handlers));
    this.commandHandlers = { ...this.commandHandlers, ...handlers };
  }

  /**
   * LLMプロバイダーとモデルを設定
   */
  public setLLMConfig(provider: string, model: string): void {
    this.llmProvider = provider;
    this.llmModel = model;
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

    // ユーザーメッセージを追加
    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
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
      const chatContext: ChatContext = this.buildChatContext(screenContext);

      // LLMの設定を適用
      APIService.setLLMProvider(this.llmProvider);
      APIService.setLLMModel(this.llmModel);

      // APIにメッセージを送信
      logger.debug('chatService', 'Sending message to LLM with context:', chatContext);
      const response = await APIService.sendChatMessage(trimmedMessage, chatContext);

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
  private buildChatContext(screenContext: ActiveScreenContext | null): ChatContext {
    const chatContext: ChatContext = {
      activeScreen: screenContext ?? undefined,
    };
    return chatContext;
  }

  /**
   * コマンドをディスパッチ
   */
  private async dispatchCommands(commands: LLMCommand[]): Promise<void> {
    for (const command of commands) {
      const handler = this.commandHandlers[command.action];
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
}

// シングルトンインスタンスをエクスポート
export default ChatService.getInstance();
