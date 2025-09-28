/**
 * API関連
 * LLM関連のAPI関連
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
 * ノートAPI関連
 */
export class NoteAPI {
  private static baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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

  static async getNote(id: string): Promise<Note> {
    const response = await fetch(`${this.baseUrl}/api/notes/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  static async getNotes(): Promise<Note[]> {
    const response = await fetch(`${this.baseUrl}/api/notes`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  static async deleteNote(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/notes/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  }
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

  static async loadLLMProviders() {
    return this.llmServiceInstance.loadProviders();
  }

  static async checkLLMHealth() {
    return this.llmServiceInstance.checkHealth();
  }

  static setLLMProvider(provider: string) {
    this.llmServiceInstance.setProvider(provider);
  }

  static setLLMModel(model: string) {
    this.llmServiceInstance.setModel(model);
  }

  static getCurrentLLMProvider(): string {
    return this.llmServiceInstance.getCurrentProvider();
  }

  static getCurrentLLMModel(): string {
    return this.llmServiceInstance.getCurrentModel();
  }

  static getAvailableLLMProviders() {
    return this.llmServiceInstance.getAvailableProviders();
  }

  // ノートAPI関連
  static async createNote(request: CreateNoteRequest): Promise<Note> {
    return NoteAPI.createNote(request);
  }

  static async updateNote(request: UpdateNoteRequest): Promise<Note> {
    return NoteAPI.updateNote(request);
  }

  static async getNote(id: string): Promise<Note> {
    return NoteAPI.getNote(id);
  }

  static async getNotes(): Promise<Note[]> {
    return NoteAPI.getNotes();
  }

  static async deleteNote(id: string): Promise<void> {
    return NoteAPI.deleteNote(id);
  }
}

export { LLMService, ChatContext, LLMResponse } from './llmService';
export default APIService;
