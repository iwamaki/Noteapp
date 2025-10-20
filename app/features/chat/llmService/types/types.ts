// LLMサービス関連の型定義
import { EditScreenContext, NotelistScreenContext } from '../../types';
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
  activeScreen?: NotelistScreenContext | EditScreenContext;
  allFiles?: Array<{
    path: string;
    title: string;
    type: 'file' | 'directory';
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
  path?: string;
  content?: string;
  description?: string;
  source?: string;
  destination?: string;
  paths?: string[];
  sources?: string[];
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
