/**
 * @file tokenUsageHelpers.ts
 * @summary トークン使用量に関連する共通ロジックを提供します
 * @responsibility トークン使用量の計算、アイコン選択、色選択などの重複ロジックを集約
 */

import { ChatMessage, TokenUsageInfo } from '../llmService/types/types';

/**
 * メッセージまたは現在のトークン使用量から使用率を取得
 * @param message チャットメッセージ（AIメッセージの場合、保存された使用率を持つ可能性がある）
 * @param tokenUsage 現在のトークン使用量情報
 * @returns トークン使用率（0.0-1.0）、または undefined
 */
export const getTokenUsageRatio = (
  message: ChatMessage | null,
  tokenUsage: TokenUsageInfo | null
): number | undefined => {
  // メッセージに保存されたtokenUsageRatioを優先的に使用
  if (message?.role === 'ai' && message.tokenUsageRatio !== undefined) {
    return message.tokenUsageRatio;
  }

  // 現在のトークン使用量から取得
  if (tokenUsage) {
    return tokenUsage.usageRatio;
  }

  return undefined;
};

/**
 * トークン使用率に応じたAIアイコン名を取得
 * @param usageRatio トークン使用率（0.0-1.0）
 * @param isLoading ローディング中かどうか
 * @returns Material Community Icons のアイコン名
 */
export const getAIIconName = (
  usageRatio: number | undefined,
  isLoading: boolean
): string => {
  if (usageRatio === undefined) {
    return 'robot';
  }

  const percentage = usageRatio * 100;

  // 100%超えで要約中の場合
  if (percentage >= 100 && isLoading) {
    return 'robot-dead';
  }

  // 75%~99%
  if (percentage >= 75) {
    return 'robot-angry';
  }

  // 25%~75%
  if (percentage >= 25) {
    return 'robot';
  }

  // 0~25%
  return 'robot-excited';
};

/**
 * トークン使用量に応じたプログレスバーの色を取得
 * @param tokenUsage トークン使用量情報
 * @param colors テーマカラー
 * @returns プログレスバーの色
 */
export const getTokenUsageBarColor = (
  tokenUsage: TokenUsageInfo,
  colors: { success: string; danger: string; warning: string }
): string => {
  const percentage = tokenUsage.usageRatio * 100;

  // 色の決定: 80%以上は赤、60-80%は黄、60%以下は緑
  if (tokenUsage.needsSummary) {
    return colors.danger;
  } else if (percentage > 60) {
    return colors.warning;
  } else {
    return colors.success;
  }
};
