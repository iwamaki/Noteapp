/**
 * @file types.ts
 * @summary ChatServiceの型定義を提供します
 * @responsibility ActiveScreenContextとActiveScreenContextProviderのインターフェース定義、
 *                 およびチャットサービスで使用される型を定義します
 */

import { LLMCommand } from './llmService/types/index';

/**
 * アクティブな画面のコンテキスト情報
 * LLMに共有したい画面固有の情報を保持します
 */
export interface FilelistScreenContext {
  name: 'filelist';
  // Note: visibleFileList は廃止（冗長）
  // 全ファイル情報は ChatContext.allFiles として送信される
}

export interface EditScreenContext {
  name: 'edit';
  filePath: string;
  fileContent: string;
}

export type ActiveScreenContext = FilelistScreenContext | EditScreenContext;

/**
 * アクティブな画面のコンテキストプロバイダー
 * 各画面がこのインターフェースを実装し、ChatServiceに登録します
 */
export interface ActiveScreenContextProvider {
  /**
   * 画面のコンテキスト情報を取得
   * @returns 現在の画面のコンテキスト情報
   */
  getScreenContext(): Promise<ActiveScreenContext>;

  /**
   * LLMからのコマンドを処理するハンドラを登録（オプション）
   * @param handlers コマンド名をキーとしたハンドラのマップ
   */
  registerCommandHandlers?(handlers: Record<string, (command: LLMCommand) => void | Promise<void>>): void;
}
