/**
 * @file index.ts
 * @summary ChatServiceクラスを提供します
 * @responsibility アプリケーション全体でチャットの状態を一元的に管理し、
 *                 画面とチャット機能を疎結合にするためのサービス層を提供します
 */

import APIService, { ChatContext } from '../llmService/api';
import { ChatMessage, LLMCommand, TokenUsageInfo } from '../llmService/types/index';
import { logger } from '../../utils/logger';
import { ActiveScreenContextProvider, ActiveScreenContext } from './types';
import { FileRepository } from '@data/repositories/fileRepository';
import { ChatAttachmentService } from './services/chatAttachmentService';
import { ChatTokenService } from './services/chatTokenService';
import { ChatCommandService } from './services/chatCommandService';
import { useLLMSettingsStore } from '../../settings/settingsStore';
import { useChatStore } from './store/chatStore';
import { UnifiedErrorHandler } from './utils/errorHandler';
import { ChatSummarizationService } from './services/chatSummarizationService';
import { ChatWebSocketManager } from './services/chatWebSocketManager';

/**
 * シングルトンクラスとして機能し、アプリケーション全体でチャットの状態を管理します。
 * 各画面は ActiveScreenContextProvider を実装し、このサービスに登録することで、
 * 疎結合な形で画面コンテキストをLLMと共有できます。
 */
class ChatService {
  private static instance: ChatService | null = null;

  // 現在アクティブなコンテキストプロバイダー
  private currentProvider: ActiveScreenContextProvider | null = null;

  // コマンドサービス
  private commandService: ChatCommandService;

  // WebSocket管理マネージャー
  private wsManager: ChatWebSocketManager;

  // 添付ファイルサービス
  private attachmentService: ChatAttachmentService;

  // トークン使用量サービス
  private tokenService: ChatTokenService;

  private constructor() {
    // プライベートコンストラクタでシングルトンを保証
    // 各サービスを初期化
    this.commandService = new ChatCommandService();
    this.wsManager = new ChatWebSocketManager();
    this.attachmentService = new ChatAttachmentService((files) => {
      this.notifyAttachedFileChange(files);
    });
    this.tokenService = new ChatTokenService(
      (tokenUsage) => {
        this.notifyTokenUsageChange(tokenUsage);
      },
      async () => {
        await this.summarizeConversation();
      }
    );
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
      this.commandService.clearContextHandlers();
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
    this.commandService.registerGlobalHandlers(handlers);
  }

  /**
   * コンテキスト依存のコマンドハンドラを登録（画面遷移時に更新）
   * @param handlers コマンド名をキーとしたハンドラのマップ
   */
  public registerCommandHandlers(handlers: Record<string, (command: LLMCommand) => void | Promise<void>>): void {
    this.commandService.registerCommandHandlers(handlers);
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
    await this.wsManager.initialize(backendUrl);
  }

  /**
   * WebSocket接続を切断
   */
  public disconnectWebSocket(): void {
    this.wsManager.disconnect();
  }

  /**
   * client_idを取得
   */
  public getClientId(): string | null {
    return this.wsManager.getClientId();
  }

  /**
   * ファイルをチャットに添付
   * @param fileId 添付するファイルのID
   */
  public async attachFile(fileId: string): Promise<void> {
    await this.attachmentService.attachFile(fileId);
  }

  /**
   * 添付ファイルをすべてクリア
   */
  public clearAttachedFiles(): void {
    this.attachmentService.clearAttachedFiles();
  }

  /**
   * 指定したインデックスの添付ファイルを削除
   * @param index 削除するファイルのインデックス
   */
  public removeAttachedFile(index: number): void {
    this.attachmentService.removeAttachedFile(index);
  }

  /**
   * 現在の添付ファイル一覧を取得
   */
  public getAttachedFiles(): Array<{ filename: string; content: string }> {
    return this.attachmentService.getAttachedFiles();
  }

  /**
   * チャットメッセージを送信
   * @param message 送信するメッセージ
   */
  public async sendMessage(message: string): Promise<void> {
    const trimmedMessage = message.trim();
    const isLoading = useChatStore.getState().isLoading;
    if (!trimmedMessage || isLoading) {
      logger.debug('chatService', 'sendMessage aborted (empty message or loading)');
      return;
    }

    // 現在の添付ファイルを取得
    const attachedFiles = this.attachmentService.getAttachedFiles();

    // ユーザーメッセージを追加（添付ファイル情報を含める）
    const userMessage: ChatMessage = {
      role: 'user',
      content: trimmedMessage,
      timestamp: new Date(),
      attachedFiles: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
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

      // WebSocket接続状態をログに出力（デバッグ用）
      const wsClient = this.wsManager.getClient();
      if (wsClient) {
        logger.info('chatService', `WebSocket state before sending message: ${wsClient.getState()}`);
      }

      // APIにメッセージを送信（client_idと添付ファイル情報も含める）
      logger.debug('chatService', 'Sending message to LLM with context:', chatContext);
      const clientId = this.wsManager.getClientId();
      const response = await APIService.sendChatMessage(trimmedMessage, chatContext, clientId, attachedFiles.length > 0 ? attachedFiles : undefined);

      // エラーメッセージの処理（トークン不足など）
      if (response.error) {
        const errorMessage: ChatMessage = {
          role: 'system',
          content: `❌ ${response.error}`,
          timestamp: new Date(),
        };
        this.addMessage(errorMessage);
        logger.error('chatService', 'Error from backend:', response.error);
        return; // エラー時は後続処理をスキップ
      }

      // AIメッセージを追加（トークン使用率を記録）
      const aiMessage: ChatMessage = {
        role: 'ai',
        content: response.message || '',
        timestamp: new Date(),
        tokenUsageRatio: response.tokenUsage?.usageRatio,
      };
      this.addMessage(aiMessage);

      // トークン使用量情報を更新（100%超過時は自動要約がトリガーされる）
      if (response.tokenUsage) {
        this.tokenService.updateTokenUsage(response.tokenUsage);

        // ローカル統計を更新（トークン消費はバックエンドで既に実行済み）
        // /api/chat がバックエンドでトークンを消費するため、ここではローカルキャッシュと統計の更新のみ
        if (response.tokenUsage.inputTokens && response.tokenUsage.outputTokens && response.model) {
          const { updateLocalTokenStats } = await import('../../billing/utils/tokenBalance');
          await updateLocalTokenStats(
            response.tokenUsage.inputTokens,
            response.tokenUsage.outputTokens,
            response.model
          );
        }
      }

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
      if (this.attachmentService.getAttachedFiles().length > 0) {
        this.clearAttachedFiles();
      }
    }
  }

  /**
   * チャット履歴をリセット
   */
  public resetChat(): void {
    logger.debug('chatService', 'Resetting chat history');
    useChatStore.getState().setMessages([]);
    this.tokenService.resetTokenUsage();
    // LLMServiceの会話履歴もクリア
    APIService.clearHistory();
  }

  /**
   * 会話履歴を要約する
   * 長い会話をシステムメッセージの要約 + 最近のメッセージで圧縮します
   */
  public async summarizeConversation(): Promise<void> {
    const { isLoading, messages } = useChatStore.getState();

    if (isLoading) {
      logger.debug('chatService', 'summarizeConversation aborted (already loading)');
      return;
    }

    if (messages.length === 0) {
      logger.warn('chatService', 'Cannot summarize: no messages in history');
      return;
    }

    this.setLoading(true);

    try {
      // 要約サービスを使用して要約を実行
      const result = await ChatSummarizationService.summarizeConversation(messages);

      if (!result.isActuallySummarized) {
        // 要約が効果的でなかった場合
        result.messages.forEach((msg) => this.addMessage(msg));
        return;
      }

      // 実際に要約された場合
      useChatStore.getState().setMessages(result.messages);

      // トークン使用量をリセット（要約後は新しいカウントになる）
      this.tokenService.resetTokenUsage();
    } catch (error) {
      const errorMessage = UnifiedErrorHandler.handleChatError(
        {
          location: 'chatService',
          operation: 'summarizeConversation',
        },
        error
      );
      this.addMessage(errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 現在のメッセージ履歴を取得
   */
  public getMessages(): ChatMessage[] {
    return useChatStore.getState().messages;
  }

  /**
   * 現在のローディング状態を取得
   */
  public getIsLoading(): boolean {
    return useChatStore.getState().isLoading;
  }

  /**
   * 現在のトークン使用量情報を取得
   */
  public getTokenUsage(): TokenUsageInfo | null {
    return this.tokenService.getTokenUsage();
  }

  // ===== プライベートメソッド =====

  /**
   * メッセージを追加
   */
  private addMessage(message: ChatMessage): void {
    logger.debug('chatService', 'Adding message:', message);
    const currentMessages = useChatStore.getState().messages;
    useChatStore.getState().setMessages([...currentMessages, message]);
  }

  /**
   * ローディング状態を設定
   */
  private setLoading(loading: boolean): void {
    useChatStore.getState().setIsLoading(loading);
  }

  /**
   * 画面コンテキストからChatContextを構築
   */
  private async buildChatContext(screenContext: ActiveScreenContext | null): Promise<ChatContext> {
    // 設定を取得
    const { settings } = useLLMSettingsStore.getState();

    // sendFileContextToLLMがtrueの場合のみ全ファイル情報を取得
    const allFilesData = settings.sendFileContextToLLM
      ? await this.getAllFilesForContext()
      : undefined;

    const attachedFiles = this.attachmentService.getAttachedFiles();

    const chatContext: ChatContext = {
      activeScreen: screenContext ?? undefined,
      allFiles: allFilesData,
      sendFileContextToLLM: settings.sendFileContextToLLM,
      attachedFileContent: attachedFiles.length > 0 ? attachedFiles : undefined,
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
    await this.commandService.dispatchCommands(commands);
  }

  /**
   * エラーを処理
   */
  private handleError(error: unknown): void {
    const errorMessage = UnifiedErrorHandler.handleChatError(
      {
        location: 'chatService',
        operation: 'sendMessage',
      },
      error
    );
    this.addMessage(errorMessage);

    // TOKEN_LIMIT_EXCEEDED エラーの場合、トークン購入の案内を追加
    if (error && typeof error === 'object' && 'code' in error && error.code === 'TOKEN_LIMIT_EXCEEDED') {
      const purchaseGuidanceMessage: ChatMessage = {
        role: 'system',
        content: '💡 トークンを購入するには、設定画面の「トークン購入」ボタンをタップしてください。',
        timestamp: new Date(),
      };
      this.addMessage(purchaseGuidanceMessage);
    }
  }

  /**
   * 添付ファイルの変更をZustandストアに通知
   */
  private notifyAttachedFileChange(files: Array<{ filename: string; content: string }>): void {
    useChatStore.getState().setAttachedFiles(files);
  }

  /**
   * トークン使用量情報の変更をZustandストアに通知
   */
  private notifyTokenUsageChange(tokenUsage: TokenUsageInfo | null): void {
    useChatStore.getState().setTokenUsage(tokenUsage);
  }
}

// シングルトンインスタンスをエクスポート
export default ChatService.getInstance();
