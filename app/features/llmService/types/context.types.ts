/**
 * @file context.types.ts
 * @summary チャットコンテキスト関連の型定義
 */

import { ChatMessage } from './message.types';

/**
 * チャットコンテキスト
 */
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
    size?: string;
    type?: string;
  };
  attachedFileContent?: Array<{
    filename: string;
    content: string;
  }>;
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
  activeScreen?: any; // FilelistScreenContext | EditScreenContext
  // フラット構造最適化: LLMには人間が読める情報のみを提供
  allFiles?: Array<{
    title: string;         // ファイル名（LLMが理解できる）
    type: 'file';         // フラット構造では常にfile（フォルダなし）
    category?: string;     // カテゴリー（階層パス形式: \"研究/AI\"）
    tags?: string[];       // タグ（柔軟な分類）
  }>;
  sendFileContextToLLM?: boolean; // ファイルコンテキストをLLMに送信するかどうか
}
