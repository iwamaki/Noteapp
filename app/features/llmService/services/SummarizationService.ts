/**
 * @file SummarizationService.ts
 * @summary LLM要約サービス
 * @responsibility 会話履歴と文書の要約処理を担当
 */

import { logger } from '../../../utils/logger';
import { HttpClient } from '../../api';
import type {
  ChatMessage,
  SummarizeRequest,
  SummarizeResponse,
} from '../types/index';
import { LLMError } from '../types/LLMError';

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
 * 要約サービスクラス
 */
export class SummarizationService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * 会話履歴を要約する（拡張版）
   * 圧縮率判定、ローカル統計更新、メッセージ生成を含む
   * @param conversationStore Zustandストア（useConversationStore.getState()の結果）
   * @param currentMessages 現在のメッセージ履歴（UI用）
   * @param currentProvider 現在のプロバイダー
   * @param currentModel 現在のモデル
   * @returns 要約結果
   */
  async summarizeConversation(
    conversationStore: { getHistory: () => ChatMessage[]; clear: () => void; setHistory: (history: ChatMessage[]) => void },
    currentMessages: ChatMessage[],
    currentProvider: string,
    currentModel: string
  ): Promise<SummarizationResult> {
    try {
      // 現在の会話履歴を取得
      const history = conversationStore.getHistory().map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }));

      if (history.length === 0) {
        throw new LLMError('会話履歴が空です', 'EMPTY_HISTORY');
      }

      logger.info('llm', `Summarizing conversation with ${history.length} messages`);

      // 要約リクエストを送信
      const request: SummarizeRequest = {
        conversationHistory: history,
        provider: currentProvider,
        model: currentModel,
      };

      const response = await this.httpClient.post('/api/chat/summarize', request);

      if (response.status < 200 || response.status >= 300) {
        throw new LLMError(
          `HTTP error! status: ${response.status}`,
          'HTTP_ERROR',
          response.status
        );
      }

      const result: SummarizeResponse = response.data;

      // compressionRatioが0.95以上の場合（効果が小さい、または逆効果）
      const isActuallySummarized = result.compressionRatio < 0.95;

      if (!isActuallySummarized) {
        // 要約が効果的でなかった場合
        logger.info(
          'llm',
          `Summarization not effective (compressionRatio: ${result.compressionRatio})`
        );

        const infoMessage = this.createNotEffectiveMessage(result);

        return {
          isActuallySummarized: false,
          messages: [infoMessage],
          response: result,
        };
      }

      // 会話履歴を要約結果で置き換える（ストア経由）
      const newHistory: ChatMessage[] = [];

      // システムメッセージ（要約）を追加
      const summaryMessage: ChatMessage = {
        role: 'system',
        content: result.summary.content,
        timestamp: result.summary.timestamp ? new Date(result.summary.timestamp) : new Date(),
      };
      newHistory.push(summaryMessage);

      // 最近のメッセージを復元
      result.recentMessages.forEach((msg) => {
        const message: ChatMessage = {
          role: msg.role as 'user' | 'ai' | 'system',
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        };
        newHistory.push(message);
      });

      // ストアに新しい履歴を設定
      conversationStore.setHistory(newHistory);

      // 実際に要約された場合のメッセージを作成
      const messages = this.createSummarizedMessages(currentMessages, result);

      logger.info(
        'llm',
        `Conversation summarized: ${result.originalTokens} -> ${result.compressedTokens} tokens (${(result.compressionRatio * 100).toFixed(1)}% reduction)`
      );

      // ローカル統計を更新（トークン消費はバックエンドで既に実行済み）
      if (result.tokenUsage?.inputTokens && result.tokenUsage?.outputTokens && result.model) {
        try {
          const { updateLocalTokenStats } = await import('../../../billing/utils/tokenBalance');
          await updateLocalTokenStats(
            result.tokenUsage.inputTokens,
            result.tokenUsage.outputTokens,
            result.model
          );
          logger.info(
            'llm',
            `Local stats updated for summarization: input=${result.tokenUsage.inputTokens}, output=${result.tokenUsage.outputTokens}, model=${result.model}`
          );
        } catch (error) {
          logger.error('llm', 'Failed to update local stats for summarization:', error);
          // ローカル統計更新の失敗はエラーとしない（要約自体は成功している）
        }
      }

      return {
        isActuallySummarized: true,
        messages,
        response: result,
      };
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError('要約の作成に失敗しました', 'SUMMARIZATION_ERROR');
    }
  }

  /**
   * 要約が効果的でなかった場合のメッセージを作成
   */
  private createNotEffectiveMessage(result: SummarizeResponse): ChatMessage {
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
  private createSummarizedMessages(
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
