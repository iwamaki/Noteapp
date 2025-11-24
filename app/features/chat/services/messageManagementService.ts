/**
 * @file messageManagementService.ts
 * @summary メッセージの作成と処理を担当するサービス
 * @responsibility チャットメッセージの作成、フォーマット、バリデーション
 */

import { ChatMessage, TokenUsageInfo } from '../../llmService/types/index';

/**
 * ユーザーメッセージを作成
 *
 * @param content メッセージ内容
 * @param attachedFiles 添付ファイル（オプション）
 * @returns 作成されたユーザーメッセージ
 */
export function createUserMessage(
  content: string,
  attachedFiles?: Array<{ filename: string; content: string }>
): ChatMessage {
  const message: ChatMessage = {
    role: 'user',
    content: content.trim(),
    timestamp: new Date(),
    attachedFiles: attachedFiles && attachedFiles.length > 0 ? [...attachedFiles] : undefined,
  };
  return message;
}

/**
 * AIメッセージを作成
 *
 * @param content メッセージ内容
 * @param tokenUsage トークン使用量情報（オプション）
 * @returns 作成されたAIメッセージ
 */
export function createAIMessage(
  content: string,
  tokenUsage?: TokenUsageInfo
): ChatMessage {
  const message: ChatMessage = {
    role: 'ai',
    content: content || '',
    timestamp: new Date(),
    tokenUsageRatio: tokenUsage?.usageRatio,
  };
  return message;
}

/**
 * エラーメッセージを作成
 *
 * @param error エラー内容
 * @returns 作成されたシステムメッセージ
 */
export function createErrorMessage(error: string): ChatMessage {
  const message: ChatMessage = {
    role: 'system',
    content: `❌ ${error}`,
    timestamp: new Date(),
  };
  return message;
}

/**
 * 警告メッセージを作成
 *
 * @param warning 警告内容
 * @returns 作成されたシステムメッセージ
 */
export function createWarningMessage(warning: string): ChatMessage {
  const message: ChatMessage = {
    role: 'system',
    content: `⚠️ ${warning}`,
    timestamp: new Date(),
  };
  return message;
}

/**
 * トークン購入案内メッセージを作成
 *
 * @returns トークン購入案内のシステムメッセージ
 */
export function createTokenPurchaseGuidanceMessage(): ChatMessage {
  const message: ChatMessage = {
    role: 'system',
    content: '💡 トークンを購入するには、設定画面の「トークン購入」ボタンをタップしてください。',
    timestamp: new Date(),
  };
  return message;
}

/**
 * メッセージが有効かどうかを検証
 *
 * @param message 検証するメッセージ
 * @returns メッセージが有効な場合true
 */
export function validateMessage(message: string): boolean {
  return message.trim().length > 0;
}
