/**
 * @file CommandService.ts
 * @summary LLMコマンドのディスパッチとハンドラー管理を担当するサービス
 * @responsibility コマンドハンドラーの登録、コマンド実行、エラーハンドリングを管理
 */

import { LLMCommand } from '../types/index';
import { logger } from '../../../utils/logger';

/**
 * LLMコマンドのディスパッチとハンドラー管理を担当するサービスクラス
 */
export class CommandService {
  // グローバルハンドラのマップ（画面に依存しない、起動時に一度だけ登録）
  private globalHandlers: Record<string, (command: LLMCommand) => void | Promise<void>> = {};

  // コンテキストハンドラのマップ（画面依存、画面遷移時に更新）
  private contextHandlers: Record<string, (command: LLMCommand) => void | Promise<void>> = {};

  /**
   * グローバルコマンドハンドラを登録（画面に依存しない）
   * 起動時に一度だけ呼び出されることを想定
   * @param handlers コマンド名をキーとしたハンドラのマップ
   */
  public registerGlobalHandlers(handlers: Record<string, (command: LLMCommand) => void | Promise<void>>): void {
    logger.debug('llm', 'Registering global command handlers:', Object.keys(handlers));
    this.globalHandlers = { ...this.globalHandlers, ...handlers };
  }

  /**
   * コンテキスト依存のコマンドハンドラを登録（画面遷移時に更新）
   * @param handlers コマンド名をキーとしたハンドラのマップ
   */
  public registerCommandHandlers(handlers: Record<string, (command: LLMCommand) => void | Promise<void>>): void {
    logger.debug('llm', 'Registering context command handlers:', Object.keys(handlers));
    this.contextHandlers = { ...this.contextHandlers, ...handlers };
  }

  /**
   * コンテキストハンドラをクリア
   * 画面遷移時に明示的にクリアする場合に使用
   */
  public clearContextHandlers(): void {
    this.contextHandlers = {};
  }

  /**
   * コマンドをディスパッチ
   * グローバルハンドラとコンテキストハンドラの両方をチェック
   * @param commands 実行するコマンドの配列
   */
  public async dispatchCommands(commands: LLMCommand[]): Promise<void> {
    for (const command of commands) {
      // コンテキストハンドラを優先、なければグローバルハンドラを使用
      const handler = this.contextHandlers[command.action] || this.globalHandlers[command.action];

      if (handler) {
        try {
          await handler(command);
          logger.debug('llm', `Command ${command.action} executed successfully`);
        } catch (error) {
          logger.error('llm', `Error executing command ${command.action}:`, error);
        }
      } else {
        logger.warn('llm', `No handler found for command: ${command.action}`);
      }
    }
  }
}
