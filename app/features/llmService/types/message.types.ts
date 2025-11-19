/**
 * @file message.types.ts
 * @summary チャットメッセージ関連の型定義
 */

/**
 * チャットメッセージ
 */
export interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  attachedFiles?: Array<{
    filename: string;
    content: string;
  }>;
  tokenUsageRatio?: number; // メッセージ作成時のトークン使用率（0.0~1.0以上）
  isSummarized?: boolean; // このメッセージが要約済みかどうか（表示用フラグ）
}
