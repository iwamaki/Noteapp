/**
 * @file chatSummarizationService.ts
 * @summary チャット要約サービス
 * @responsibility 会話履歴の要約処理を担当
 */

import { logger } from '../../../utils/logger';
import APIService from '../../llmService/api';
import { ChatMessage, SummarizeResponse } from '../../llmService/types/index';
import { UnifiedErrorHandler } from '../utils/errorHandler';

/**
 * 要約結果の型
 */
export interface SummarizationResult {
  /** 要約が実際に適用されたか */
  isActuallySummarized: boolean;
  /** 要約後のメッセージ（システムメッセージなど） */
  messages: ChatMessage[];
  /** 要約レスポンス */
  response: SummarizeResponse;
}

/**
 * チャット要約サービスクラス
 */
export class ChatSummarizationService {
  /**
   * 会話履歴を要約する
   * 長い会話をシステムメッセージの要約 + 最近のメッセージで圧縮します
   *
   * @param currentMessages 現在のメッセージ履歴
   * @returns 要約結果
   */
  static async summarizeConversation(
    currentMessages: ChatMessage[]
  ): Promise<SummarizationResult> {
    if (currentMessages.length === 0) {
      logger.warn('chatService', 'Cannot summarize: no messages in history');
      throw new Error('会話履歴が空です');
    }

    try {
      logger.info('chatService', 'Starting conversation summarization');

      // APIServiceを通じて要約を実行
      const result: SummarizeResponse = await APIService.summarizeConversation();

      // compressionRatioが0.95以上の場合（効果が小さい、または逆効果）
      const isActuallySummarized = result.compressionRatio < 0.95;

      if (!isActuallySummarized) {
        // 要約が効果的でなかった場合
        logger.info(
          'chatService',
          `Summarization not effective (compressionRatio: ${result.compressionRatio})`
        );

        const infoMessage = this.createNotEffectiveMessage(result);

        return {
          isActuallySummarized: false,
          messages: [infoMessage],
          response: result,
        };
      }

      // 実際に要約された場合のメッセージを作成
      const messages = this.createSummarizedMessages(currentMessages, result);

      logger.info(
        'chatService',
        `Conversation summarized: ${result.originalTokens} -> ${result.compressedTokens} tokens (${(result.compressionRatio * 100).toFixed(1)}% reduction)`
      );

      // ローカル統計を更新（トークン消費はバックエンドで既に実行済み）
      // 要約APIもバックエンドでトークンを消費するため、ここではローカルキャッシュと統計の更新のみ
      if (result.tokenUsage?.inputTokens && result.tokenUsage?.outputTokens && result.model) {
        try {
          const { updateLocalTokenStats } = await import('../../../billing/utils/tokenBalance');
          await updateLocalTokenStats(
            result.tokenUsage.inputTokens,
            result.tokenUsage.outputTokens,
            result.model
          );
          logger.info(
            'chatService',
            `Local stats updated for summarization: input=${result.tokenUsage.inputTokens}, output=${result.tokenUsage.outputTokens}, model=${result.model}`
          );
        } catch (error) {
          logger.error('chatService', 'Failed to update local stats for summarization:', error);
          // ローカル統計更新の失敗はエラーとしない（要約自体は成功している）
        }
      }

      return {
        isActuallySummarized: true,
        messages,
        response: result,
      };
    } catch (error) {
      UnifiedErrorHandler.handleChatError(
        {
          location: 'chatService',
          operation: 'summarizeConversation',
        },
        error
      );

      throw error;
    }
  }

  /**
   * 要約が効果的でなかった場合のメッセージを作成
   */
  private static createNotEffectiveMessage(result: SummarizeResponse): ChatMessage {
    let message: string;

    if (result.compressionRatio >= 1.0) {
      // トークンが増えた場合
      const increase = result.compressedTokens - result.originalTokens;
      message = `⚠️ 要約を実行しましたが、トークン数が削減されませんでした。\n\n元のトークン数: ${result.originalTokens}\n要約後: ${result.compressedTokens}（+${increase}）\n\n会話が短すぎるため、要約の効果がありません。\nもう少し会話を続けてから要約をお試しください。`;
    } else {
      // 削減効果が小さい場合
      const reduction = ((1 - result.compressionRatio) * 100).toFixed(1);
      message = `ℹ️ 要約の削減効果が小さいため、適用されませんでした。\n\n元のトークン数: ${result.originalTokens}\n要約後: ${result.compressedTokens}\n削減率: ${reduction}%\n\nもう少し会話を続けてから要約をお試しください。`;
    }

    return {
      role: 'system',
      content: message,
      timestamp: new Date(),
    };
  }

  /**
   * 要約後のメッセージリストを作成
   * 既存のメッセージにisSummarizedフラグを追加し、要約メッセージと完了メッセージを追加
   */
  private static createSummarizedMessages(
    currentMessages: ChatMessage[],
    result: SummarizeResponse
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // 要約前のすべてのメッセージにisSummarizedフラグを追加
    const summarizedMessages = currentMessages.map((msg) => ({
      ...msg,
      isSummarized: true,
    }));
    messages.push(...summarizedMessages);

    // 要約システムメッセージを追加（区切りとして）
    const summaryMessage: ChatMessage = {
      role: 'system',
      content: `📝 **会話の要約**\n\n${result.summary.content}\n\n---\n\n以下は要約後の会話が続きます。`,
      timestamp: new Date(),
    };
    messages.push(summaryMessage);

    // 要約完了のシステムメッセージを追加
    const completionMessage: ChatMessage = {
      role: 'system',
      content: `✅ 要約が完了しました。${result.originalTokens}トークン → ${result.compressedTokens}トークン（${((1 - result.compressionRatio) * 100).toFixed(1)}%削減）`,
      timestamp: new Date(),
    };
    messages.push(completionMessage);

    return messages;
  }
}
