/**
 * @file command.types.ts
 * @summary LLMコマンド・レスポンス関連の型定義
 */

import { TokenUsageInfo } from './config.types';

/**
 * LLMコマンド
 */
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
  category?: string;      // カテゴリー（階層パス形式: \"研究/AI\"）
  tags?: string[];        // タグ

  // 行ベース編集用フィールド（edit_file_linesツール用）
  start_line?: number;    // 開始行（1-based, inclusive）
  end_line?: number;      // 終了行（1-based, inclusive）
}

/**
 * LLMレスポンス
 */
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
