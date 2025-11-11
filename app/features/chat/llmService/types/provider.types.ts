/**
 * @file provider.types.ts
 * @summary LLMプロバイダー関連の型定義
 */

/**
 * モデルのメタデータ
 */
export interface ModelMetadata {
  category: 'quick' | 'think';
  displayName?: string;
  description?: string;
  recommended?: boolean;
}

/**
 * LLMプロバイダー情報
 */
export interface LLMProvider {
  name: string;
  defaultModel: string;
  models: string[];
  status: 'available' | 'unavailable' | 'error';
  modelMetadata?: Record<string, ModelMetadata>;
}

/**
 * LLMヘルスステータス
 */
export interface LLMHealthStatus {
  status: 'ok' | 'error';
  providers: Record<string, LLMProvider>;
}
