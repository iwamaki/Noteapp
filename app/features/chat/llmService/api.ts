/**
 * @file api.ts
 * @summary このファイルは、アプリケーションの主要なAPIサービスを定義します。
 * @responsibility LLM（大規模言語モデル）との通信を抽象化し、チャットメッセージの送信やLLMプロバイダーの設定などの機能を提供する責任があります。
 */

import { ChatContext, LLMResponse, LLMService, SummarizeResponse, DocumentSummarizeResponse } from './index';
import { getModelCategoryFromId } from './utils/modelCategoryHelper';
import { providerCache } from './cache/providerCache';

export interface CreateFileRequest {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateFileRequest {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
}


/**
 * API関連
 * LLM関連のAPI関連
 */
export class APIService {
  private static llmServiceInstance = new LLMService();

  // LLM関連のAPI関連
  static async sendChatMessage(
    message: string,
    context?: ChatContext,
    clientId?: string | null,
    attachedFiles?: Array<{ filename: string; content: string }>
  ): Promise<LLMResponse> {
    return this.llmServiceInstance.sendChatMessage(message, context, clientId, attachedFiles);
  }

  // LLMプロバイダーのロード
  static async loadLLMProviders() {
    return this.llmServiceInstance.loadProviders();
  }

  // LLMのヘルスチェック
  static async checkLLMHealth() {
    return this.llmServiceInstance.checkHealth();
  }

  // LLMプロバイダーとモデルの設定
  static setLLMProvider(provider: string) {
    this.llmServiceInstance.setProvider(provider);
  }

  // LLMモデルの設定
  static setLLMModel(model: string) {
    this.llmServiceInstance.setModel(model);
  }

  // 現在のLLMプロバイダーとモデルの取得
  static getCurrentLLMProvider(): string {
    return this.llmServiceInstance.getCurrentProvider();
  }

  // 現在のLLMモデルの取得
  static getCurrentLLMModel(): string {
    return this.llmServiceInstance.getCurrentModel();
  }

  // 利用可能なLLMプロバイダーの取得
  static getAvailableLLMProviders() {
    return this.llmServiceInstance.getAvailableProviders();
  }

  // 会話履歴のクリア
  static clearHistory() {
    this.llmServiceInstance.clearHistory();
  }

  // キャッシュされたLLMプロバイダーを同期的に取得
  static getCachedLLMProviders() {
    return this.llmServiceInstance.getCachedProviders();
  }

  // LLMプロバイダーのキャッシュをクリア
  static refreshLLMProviders() {
    this.llmServiceInstance.refreshProviders();
  }

  /**
   * モデルIDからカテゴリー（quick/think）を取得
   * キャッシュされたプロバイダー情報のメタデータを使用
   * @param modelId モデルID
   * @returns カテゴリー（'quick' | 'think'）、メタデータがない場合はフォールバック
   */
  static getModelCategory(modelId: string): 'quick' | 'think' {
    // グローバルキャッシュから取得（循環参照回避）
    const providers = providerCache.getCache();
    return getModelCategoryFromId(modelId, providers);
  }

  // 会話履歴を要約
  static async summarizeConversation(): Promise<SummarizeResponse> {
    return this.llmServiceInstance.summarizeConversation();
  }

  // 文書を要約
  static async summarizeDocument(content: string, title: string): Promise<DocumentSummarizeResponse> {
    return this.llmServiceInstance.summarizeDocument(content, title);
  }

  // === RAG（知識ベース）関連のAPI ===

  /**
   * テキストを知識ベースにアップロード
   * @param text アップロードするテキスト
   * @param collectionName コレクション名（デフォルト: "default"）
   * @param metadataTitle ドキュメントのタイトル（オプション）
   * @param metadataDescription ドキュメントの説明（オプション）
   * @returns アップロード結果
   */
  static async uploadTextToKnowledgeBase(
    text: string,
    collectionName: string = 'default',
    metadataTitle?: string,
    metadataDescription?: string
  ): Promise<{
    success: boolean;
    message: string;
    document?: {
      chunks_created: number;
      total_characters: number;
      average_chunk_size: number;
    };
    knowledge_base?: {
      total_documents: number;
      collection_name: string;
    };
  }> {
    const baseUrl = this.llmServiceInstance['config'].baseUrl;
    const url = `${baseUrl}/api/knowledge-base/documents/upload-text`;

    const params: Record<string, string> = {
      collection_name: collectionName,
    };
    if (metadataTitle) params.metadata_title = metadataTitle;
    if (metadataDescription) params.metadata_description = metadataDescription;

    const queryString = new URLSearchParams(params).toString();
    const fullUrl = `${url}?${queryString}`;

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`RAG upload failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

}

export { LLMService } from './index';
export { ChatContext, LLMResponse } from './types/index';
export default APIService;
