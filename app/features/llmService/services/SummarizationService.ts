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
  DocumentSummarizeRequest,
  DocumentSummarizeResponse,
} from '../types/index';
import { LLMError } from '../types/LLMError';
import { ConversationHistory } from '../core/ConversationHistory';

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
   * @param conversationHistory 会話履歴
   * @param currentProvider 現在のプロバイダー
   * @param currentModel 現在のモデル
   * @returns 要約レスポンス
   */
  async summarizeConversation(
    conversationHistory: ConversationHistory,
    currentProvider: string,
    currentModel: string
  ): Promise<SummarizeResponse> {
    try {
      // 現在の会話履歴を取得
      const history = conversationHistory.getHistory().map((msg) => ({
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

      // 会話履歴を要約結果で置き換える
      conversationHistory.clear();

      // システムメッセージ（要約）を追加
      const summaryMessage: ChatMessage = {
        role: 'system',
        content: data.summary.content,
        timestamp: data.summary.timestamp ? new Date(data.summary.timestamp) : new Date(),
      };
      conversationHistory.addMessage(summaryMessage);

      // 最近のメッセージを復元
      data.recentMessages.forEach((msg) => {
        const message: ChatMessage = {
          role: msg.role as 'user' | 'ai' | 'system',
          content: msg.content,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        };
        conversationHistory.addMessage(message);
      });

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

  /**
   * 文書内容を要約する
   * @param content 文書の内容
   * @param title 文書のタイトル
   * @param currentProvider 現在のプロバイダー
   * @param currentModel 現在のモデル
   * @returns 要約レスポンス（要約テキストとトークン情報）
   */
  async summarizeDocument(
    content: string,
    title: string,
    currentProvider: string,
    currentModel: string
  ): Promise<DocumentSummarizeResponse> {
    try {
      logger.info(
        'llm',
        `Summarizing document: title="${title}", content_length=${content.length}, provider=${currentProvider}, model=${currentModel}`
      );

      // 要約リクエストを送信
      const request: DocumentSummarizeRequest = {
        content,
        title,
        provider: currentProvider,
        model: currentModel,
      };

      const response = await this.httpClient.post('/api/document/summarize', request);

      if (response.status < 200 || response.status >= 300) {
        throw new LLMError(
          `HTTP error! status: ${response.status}`,
          'HTTP_ERROR',
          response.status
        );
      }

      const data: DocumentSummarizeResponse = response.data;

      logger.info(
        'llm',
        `Document summarization complete: ${data.summary.substring(0, 100)}... (tokens: input=${data.inputTokens}, output=${data.outputTokens})`
      );

      return data;
    } catch (error) {
      if (error instanceof LLMError) {
        throw error;
      }
      logger.error('llm', 'Failed to summarize document:', error);
      throw new LLMError('文書要約の作成に失敗しました', 'DOCUMENT_SUMMARIZATION_ERROR');
    }
  }
}
