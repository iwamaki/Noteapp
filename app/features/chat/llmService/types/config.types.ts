/**
 * @file config.types.ts
 * @summary LLM設定・トークン使用量関連の型定義
 */

/**
 * トークン使用量情報
 */
export interface TokenUsageInfo {
  currentTokens: number;   // 現在の会話履歴のトークン数
  maxTokens: number;       // 推奨される最大トークン数
  usageRatio: number;      // 使用率（0.0-1.0）
  needsSummary: boolean;   // 要約が推奨されるかどうか

  // 今回のリクエストで実際に使用したトークン数（課金対象）
  inputTokens?: number;    // 入力トークン数
  outputTokens?: number;   // 出力トークン数
  totalTokens?: number;    // 合計トークン数
}

/**
 * LLM設定
 */
export interface LLMConfig {
  maxHistorySize: number;
  apiTimeout: number;
  baseUrl: string;
}
