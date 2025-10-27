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
import { FileRepositoryV2 } from '@data/fileRepositoryV2';
import { FolderRepositoryV2 } from '@data/folderRepositoryV2';
import { DirectoryResolver } from '@data/directoryResolver';
import { Directory } from 'expo-file-system';
import * as FileSystemUtilsV2 from '@data/fileSystemUtilsV2';
import { metadataToFolder } from '@data/types';

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
    // コンテキストハンドラのみをクリア（グローバルハンドラは維持）
    this.contextHandlers = {};
  }

  /**
   * アクティブなコンテキストプロバイダーを解除
   */
  public unregisterActiveContextProvider(): void {
    logger.debug('chatService', 'Unregistering active context provider');
    this.currentProvider = null;
    this.contextHandlers = {};
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
      const chatContext: ChatContext = await this.buildChatContext(screenContext);

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
  private async buildChatContext(screenContext: ActiveScreenContext | null): Promise<ChatContext> {
    // 全ファイルとフォルダを取得してallFiles形式に変換
    const allFilesData = await this.getAllFilesForContext();

    const chatContext: ChatContext = {
      activeScreen: screenContext ?? undefined,
      allFiles: allFilesData,
    };
    return chatContext;
  }

  /**
   * LLMコンテキスト用に全ファイル・フォルダ情報を取得（V2）
   *
   * V2では全件取得パターンが排除されているため、再帰的に全アイテムを収集します。
   * これはLLMコンテキスト用の正当なユースケースです。
   */
  private async getAllFilesForContext(): Promise<Array<{ title: string; path: string; type: 'file' | 'folder' }>> {
    try {
      const allItems: Array<{ title: string; path: string; type: 'file' | 'folder' }> = [];

      // ルートディレクトリから再帰的に全アイテムを収集
      await this.collectAllItemsRecursively(DirectoryResolver.getRootDirectory(), '/', allItems);

      const fileCount = allItems.filter(item => item.type === 'file').length;
      const folderCount = allItems.filter(item => item.type === 'folder').length;
      logger.debug('chatService', `Retrieved ${fileCount} files and ${folderCount} folders for LLM context (V2)`);

      return allItems;
    } catch (error) {
      logger.error('chatService', 'Error getting all files for context (V2):', error);
      return [];
    }
  }

  /**
   * 再帰的に全フォルダと全ファイルを収集するヘルパー関数（V2）
   *
   * @param folderDir - 現在のフォルダディレクトリ
   * @param currentPath - 現在の仮想パス（例: "/folder1/"）
   * @param allItems - 収集結果を格納する配列
   */
  private async collectAllItemsRecursively(
    folderDir: Directory,
    currentPath: string,
    allItems: Array<{ title: string; path: string; type: 'file' | 'folder' }>
  ): Promise<void> {
    try {
      // 現在のフォルダ内のサブフォルダを取得
      const subfolders = await FileSystemUtilsV2.listSubfoldersInFolder(folderDir);

      // 各サブフォルダをアイテムリストに追加し、再帰的に探索
      for (const subfolder of subfolders) {
        const subfolderPath = currentPath === '/' ? `/${subfolder.slug}/` : `${currentPath}${subfolder.slug}/`;

        allItems.push({
          title: subfolder.name,
          path: subfolderPath,
          type: 'folder',
        });

        // サブフォルダを再帰的に探索
        const subfolderDir = new Directory(folderDir, subfolder.slug);
        await this.collectAllItemsRecursively(subfolderDir, subfolderPath, allItems);
      }

      // 現在のフォルダ内のファイルを取得
      const files = await FileSystemUtilsV2.listFilesInFolder(folderDir);

      // 各ファイルをアイテムリストに追加
      for (const file of files) {
        const filePath = currentPath === '/' ? `/${file.title}` : `${currentPath}${file.title}`;

        allItems.push({
          title: file.title,
          path: filePath,
          type: 'file',
        });
      }
    } catch (error) {
      logger.error('chatService', `Error collecting items from ${currentPath}:`, error);
      // エラーが発生しても処理を続行（部分的な結果を返す）
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
}

// シングルトンインスタンスをエクスポート
export default ChatService.getInstance();
