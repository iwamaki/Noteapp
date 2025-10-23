/**
 * @file types.ts
 * @summary コマンドハンドラの型定義
 * @responsibility ハンドラのインターフェースと依存関係の型を定義します
 */

import { LLMCommand } from '../llmService/types/types';

/**
 * コマンドハンドラのコンテキスト
 * ハンドラが必要とする依存関係をまとめたインターフェース
 */
export interface CommandHandlerContext {
  // ノート編集画面用のコンテキスト
  setContent?: (content: string) => void;

  // ファイル一覧画面用のコンテキスト
  refreshData?: () => Promise<void>;

  // 将来的な拡張のための予約フィールド
  [key: string]: any;
}

/**
 * コマンドハンドラの型
 * LLMコマンドを受け取り、必要に応じてコンテキストを使用して処理を行う
 */
export type CommandHandler = (
  command: LLMCommand,
  context?: CommandHandlerContext
) => void | Promise<void>;

/**
 * ハンドラマップの型
 */
export type CommandHandlerMap = Record<string, CommandHandler>;
