/**
 * @file api.ts
 * @summary このファイルは、アプリケーションの主要なAPIサービスを定義します。
 * @responsibility LLM（大規模言語モデル）との通信を抽象化し、チャットメッセージの送信やLLMプロバイダーの設定などの機能を提供する責任があります。
 */

import { LLMService, ChatContext, LLMResponse } from './llmService';

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateNoteRequest {
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
  static async sendChatMessage(message: string, context?: ChatContext): Promise<LLMResponse> {
    return this.llmServiceInstance.sendChatMessage(message, context);
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

}

export { LLMService, ChatContext, LLMResponse } from './llmService';
export default APIService;
