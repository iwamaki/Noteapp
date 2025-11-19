/**
 * @file settingsStore.ts
 * @summary 設定ストアの統合エクスポートファイル
 * @description
 * このファイルは、分割された各設定ストアを統合的にエクスポートします。
 * 既存のコードとの互換性を保ちつつ、内部的には責任ごとに分割されたストアを使用します。
 *
 * ## アーキテクチャ
 * - **settingsFacade**: 既存コードとの互換性を保つメインストア
 * - **個別ストア**: 将来的な段階的移行のため、各ストアも個別にエクスポート
 *
 * ## 使用方法
 * ```typescript
 * // 既存の使い方（変更不要）
 * import { useSettingsStore } from './settingsStore';
 *
 * // 将来的な使い方（段階的に移行）
 * import { useUISettingsStore } from './settingsStore';
 * ```
 */

// ==========================================
// メインエクスポート（既存コード互換性用）
// ==========================================
export {
  useSettingsStore,
  TOKEN_CAPACITY_LIMITS,
  type AppSettings,
} from './stores/settingsFacade';

// ==========================================
// 個別ストアのエクスポート（段階的移行用）
// ==========================================

// UI設定ストア
export { useUISettingsStore } from './stores/uiSettingsStore';
export type { UISettings } from './types/uiSettings.types';

// エディタ設定ストア
export { useEditorSettingsStore } from './stores/editorSettingsStore';
export type { EditorSettings } from './types/editorSettings.types';

// LLM設定ストア
export { useLLMSettingsStore } from './stores/llmSettingsStore';
export type { LLMSettings } from './types/llmSettings.types';

// システム設定ストア
export { useSystemSettingsStore } from './stores/systemSettingsStore';
export type { SystemSettings } from './types/systemSettings.types';

// ==========================================
// 課金関連ストアのエクスポート
// ==========================================

// トークン残高ストア
export { useTokenBalanceStore } from './stores/tokenBalanceStore';
export type {
  TokenBalance,
  LoadedModels,
  PurchaseRecord,
} from './types/tokenBalance.types';

// 使用量トラッキングストア
export { useUsageTrackingStore } from './stores/usageTrackingStore';
export type { UsageData } from './types/usage.types';

// ==========================================
// サービスクラスのエクスポート
// ==========================================
export { SettingsPersistenceService } from './services/settingsPersistenceService';
