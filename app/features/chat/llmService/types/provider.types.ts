/**
 * @file provider.types.ts
 * @summary LLMプロバイダー関連の型定義
 */

/**
 * LLMプロバイダー情報
 */
export interface LLMProvider {
  name: string;
  defaultModel: string;
  models: string[];
  status: 'available' | 'unavailable' | 'error';
}

/**
 * LLMヘルスステータス
 */
export interface LLMHealthStatus {
  status: 'ok' | 'error';
  providers: Record<string, LLMProvider>;
}
