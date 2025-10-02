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

/** ノートAPI関連(バックエンドデータベースとの通信)
 * 

export class NoteAPI {
  private static baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

  // Noteの作成
  static async createNote(request: CreateNoteRequest): Promise<Note> {
    const response = await fetch(`${this.baseUrl}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Noteの更新
  static async updateNote(request: UpdateNoteRequest): Promise<Note> {
    const response = await fetch(`${this.baseUrl}/api/notes/${request.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Noteの取得
  static async getNote(id: string): Promise<Note> {
    const response = await fetch(`${this.baseUrl}/api/notes/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Note一覧の取得
  static async getNotes(): Promise<Note[]> {
    const response = await fetch(`${this.baseUrl}/api/notes`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  // Noteの削除
  static async deleteNote(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/notes/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
} 

*/


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

/* 

  // ノートAPI関連
  static async createNote(request: CreateNoteRequest): Promise<Note> {
    return NoteAPI.createNote(request);
  }

  // Noteの更新
  static async updateNote(request: UpdateNoteRequest): Promise<Note> {
    return NoteAPI.updateNote(request);
  }

  // Noteの取得
  static async getNote(id: string): Promise<Note> {
    return NoteAPI.getNote(id);
  }

  // Note一覧の取得
  static async getNotes(): Promise<Note[]> {
    return NoteAPI.getNotes();
  }

  // Noteの削除
  static async deleteNote(id: string): Promise<void> {
    return NoteAPI.deleteNote(id);
  }
*/

}

export { LLMService, ChatContext, LLMResponse } from './llmService';
export default APIService;
