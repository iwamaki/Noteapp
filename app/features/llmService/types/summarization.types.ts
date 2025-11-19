/**
 * @file summarization.types.ts
 * @summary 会話要約関連の型定義
 */

/**
 * 要約リクエスト
 */
export interface SummarizeRequest {
  conversationHistory: Array<{role: string; content: string; timestamp?: string}>;
  max_tokens?: number;
  preserve_recent?: number;
  provider?: string;
  model?: string;
}

/**
 * 要約結果（システムメッセージ）
 */
export interface SummaryResult {
  role: 'system';
  content: string;
  timestamp?: string;
}

/**
 * 要約レスポンス
 */
export interface SummarizeResponse {
  summary: SummaryResult;
  recentMessages: Array<{role: string; content: string; timestamp?: string}>;
  compressionRatio: number;
  originalTokens: number;
  compressedTokens: number;
}
