// LLMサービス関連の型定義
import { EditScreenContext, FilelistScreenContext } from '../../types';
export interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
}

// チャットコンテキスト
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
  attachedFileContent?: {
    filename: string;
    content: string;
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
  activeScreen?: FilelistScreenContext | EditScreenContext;
  // フラット構造最適化: LLMには人間が読める情報のみを提供
  allFiles?: Array<{
    title: string;         // ファイル名（LLMが理解できる）
    type: 'file';         // フラット構造では常にfile（フォルダなし）
    categories?: string[]; // カテゴリー（仮想フォルダとして機能）
    tags?: string[];       // タグ（柔軟な分類）
  }>;
}

// LLMプロバイダー情報
export interface LLMProvider {
  name: string;
  defaultModel: string;
  models: string[];
  status: 'available' | 'unavailable' | 'error';
}

// LLMコマンド
export interface LLMCommand {
  action: string;

  // 旧階層構造用フィールド（互換性のため残す）
  path?: string;
  source?: string;
  destination?: string;
  source_path?: string;
  dest_path?: string;
  paths?: string[];
  sources?: string[];

  // 共通フィールド
  content?: string;
  description?: string;

  // フラット構造用フィールド
  title?: string;         // ファイル名（フラット構造では title で識別）
  new_title?: string;     // リネーム時の新しいファイル名
  categories?: string[];  // カテゴリー
  tags?: string[];        // タグ
}

// LLMレスポンス
export interface LLMResponse {
  message: string;
  commands?: LLMCommand[];
  provider?: string;
  model?: string;
  historyCount?: number;
  shouldSuggestNewChat?: boolean;
  warning?: string;
}

// LLMヘルスステータス
export interface LLMHealthStatus {
  status: 'ok' | 'error';
  providers: Record<string, LLMProvider>;
}

// LLM設定
export interface LLMConfig {
  maxHistorySize: number;
  apiTimeout: number;
  baseUrl: string;
}
