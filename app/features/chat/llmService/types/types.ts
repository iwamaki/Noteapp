// LLMサービス関連の型定義
import { EditScreenContext, FilelistScreenContext } from '../../types';
export interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  attachedFiles?: Array<{
    filename: string;
    content: string;
  }>;
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
  activeScreen?: FilelistScreenContext | EditScreenContext;
  // フラット構造最適化: LLMには人間が読める情報のみを提供
  allFiles?: Array<{
    title: string;         // ファイル名（LLMが理解できる）
    type: 'file';         // フラット構造では常にfile（フォルダなし）
    category?: string;     // カテゴリー（階層パス形式: "研究/AI"）
    tags?: string[];       // タグ（柔軟な分類）
  }>;
  sendFileContextToLLM?: boolean; // ファイルコンテキストをLLMに送信するかどうか
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
  category?: string;      // カテゴリー（階層パス形式: "研究/AI"）
  tags?: string[];        // タグ

  // 行ベース編集用フィールド（edit_file_linesツール用）
  start_line?: number;    // 開始行（1-based, inclusive）
  end_line?: number;      // 終了行（1-based, inclusive）
}

// トークン使用量情報
export interface TokenUsageInfo {
  currentTokens: number;   // 現在の会話履歴のトークン数
  maxTokens: number;       // 推奨される最大トークン数
  usageRatio: number;      // 使用率（0.0-1.0）
  needsSummary: boolean;   // 要約が推奨されるかどうか
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
  tokenUsage?: TokenUsageInfo;  // トークン使用量情報
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

// 要約リクエスト
export interface SummarizeRequest {
  conversationHistory: Array<{role: string; content: string; timestamp?: string}>;
  max_tokens?: number;
  preserve_recent?: number;
  provider?: string;
  model?: string;
}

// 要約結果（システムメッセージ）
export interface SummaryResult {
  role: 'system';
  content: string;
  timestamp?: string;
}

// 要約レスポンス
export interface SummarizeResponse {
  summary: SummaryResult;
  recentMessages: Array<{role: string; content: string; timestamp?: string}>;
  compressionRatio: number;
  originalTokens: number;
  compressedTokens: number;
}
