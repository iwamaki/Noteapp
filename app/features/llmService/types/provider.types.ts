/**
 * @file provider.types.ts
 * @summary LLMプロバイダー関連の型定義
 */

/**
 * 原価情報（USD/1M tokens）
 */
export interface CostInfo {
  inputPricePer1M: number;
  outputPricePer1M: number;
}

/**
 * 価格情報
 */
export interface PricingInfo {
  cost: CostInfo; // 原価（USD）
  sellingPriceJPY: number; // 販売価格（JPY/1M tokens）
}

/**
 * モデルのメタデータ
 */
export interface ModelMetadata {
  category: 'quick' | 'think';
  displayName?: string;
  description?: string;
  recommended?: boolean;
  pricing?: PricingInfo; // 価格情報
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
