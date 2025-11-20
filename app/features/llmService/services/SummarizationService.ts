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
 * 要約サービスクラス
 */
export class SummarizationService {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * 会話履歴を要約する
   * @param conversationStore Zustandストア（useConversationStore.getState()の結果）
   * @param currentProvider 現在のプロバイダー
   * @param currentModel 現在のモデル
   * @returns 要約レスポンス
   */
  async summarizeConversation(
    conversationStore: { getHistory: () => ChatMessage[]; clear: () => void; setHistory: (history: ChatMessage[]) => void },
    currentProvider: string,
    currentModel: string
  ): Promise<SummarizeResponse> {
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

      const data: SummarizeResponse = response.data;

      // 会話履歴を要約結果で置き換える（ストア経由）
      const newHistory: ChatMessage[] = [];

      // システムメッセージ（要約）を追加
      const summaryMessage: ChatMessage = {
        role: 'system',
        content: data.summary.content,
        timestamp: data.summary.timestamp ? new Date(data.summary.timestamp) : new Date(),
      };
      newHistory.push(summaryMessage);

      // 最近のメッセージを復元
      data.recentMessages.forEach((msg) => {
        const message: ChatMessage = {
          role: msg.role as 'user' | 'ai' | 'system',
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        };
        newHistory.push(message);
      });

      // ストアに新しい履歴を設定
      conversationStore.setHistory(newHistory);

      logger.info(
        'llm',
        `Conversation summarized: ${data.originalTokens} -> ${data.compressedTokens} tokens (${(data.compressionRatio * 100).toFixed(1)}% reduction)`
      );

      return data;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      throw new LLMError('要約の作成に失敗しました', 'SUMMARIZATION_ERROR');
    }
  }

}
