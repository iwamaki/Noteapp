/**
 * @file types.ts
 * @summary ChatServiceの型定義を提供します
 * @responsibility ActiveScreenContextとActiveScreenContextProviderのインターフェース定義、
 *                 およびチャットサービスで使用される型を定義します
 */

import { LLMCommand } from '../../services/llmService/types/types';

/**
 * アクティブな画面のコンテキスト情報
 * LLMに共有したい画面固有の情報を保持します
 */
export interface FileListItem {
  filePath: string;
  tags?: string[];
}

export interface NotelistScreenContext {
  name: 'notelist';
  currentPath: string;
  visibleFileList: FileListItem[];
  selectedFileList?: FileListItem[];
}

export interface EditScreenContext {
  name: 'edit';
  filePath: string;
  fileContent: string;
}

export type ActiveScreenContext = NotelistScreenContext | EditScreenContext;

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

/**
 * ChatServiceのイベントリスナー
 */
export interface ChatServiceListener {
  /** チャットメッセージが更新されたときに呼ばれる */
  onMessagesUpdate?: (messages: any[]) => void;
  /** ローディング状態が変更されたときに呼ばれる */
  onLoadingChange?: (isLoading: boolean) => void;
}
