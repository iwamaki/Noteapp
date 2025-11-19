/**
 * @file usage.types.ts
 * @summary 使用量トラッキング関連の型定義
 */

export interface UsageData {
  // コスト計算用（レガシー）
  monthlyInputTokens: number; // 今月の入力トークン数（全体）
  monthlyOutputTokens: number; // 今月の出力トークン数（全体）

  // モデル別の詳細使用量（サブスク上限チェック + コスト計算用）
  monthlyTokensByModel: {
    [modelId: string]: {
      inputTokens: number;
      outputTokens: number;
    };
  };

  // 補助的な指標
  monthlyLLMRequests: number; // 今月のLLMリクエスト数（スパム防止、UX表示用）

  // Phase 2以降（クラウド同期時）
  currentFileCount: number; // 現在のファイル数
  storageUsedMB: number; // 使用中のストレージ容量（MB）

  lastSyncedAt?: string; // 最後に同期した日時
  lastResetMonth?: string; // 最後に月次リセットした月 (YYYY-MM形式)
}

export const defaultUsageData: UsageData = {
  monthlyInputTokens: 0,
  monthlyOutputTokens: 0,
  monthlyTokensByModel: {},
  monthlyLLMRequests: 0,
  currentFileCount: 0,
  storageUsedMB: 0,
  lastSyncedAt: undefined,
  lastResetMonth: undefined,
};
