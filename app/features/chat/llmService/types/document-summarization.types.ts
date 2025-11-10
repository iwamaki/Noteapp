/**
 * @file document-summarization.types.ts
 * @summary 文書要約関連の型定義
 */

/**
 * 文書要約リクエスト
 */
export interface DocumentSummarizeRequest {
  content: string;
  title: string;
  provider?: string;
  model?: string;
}

/**
 * 文書要約レスポンス
 */
export interface DocumentSummarizeResponse {
  summary: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}
