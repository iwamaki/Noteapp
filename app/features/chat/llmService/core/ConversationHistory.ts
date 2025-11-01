import { ChatMessage } from '../types/types';

/**
 * 会話履歴管理クラス（インスタンス化対応）
 */
export class ConversationHistory {
  private history: ChatMessage[] = [];
  private maxHistorySize: number;

  constructor(maxHistorySize = 100) {
    this.maxHistorySize = maxHistorySize;
  }

  getHistory(): ChatMessage[] {
    return [...this.history];
  }

  addMessage(message: ChatMessage): void {
    this.history.push(message);
    this.trimHistory();
  }

  addExchange(
    userMessage: string,
    aiResponse: string,
    attachedFile?: { filename: string; content: string }
  ): void {
    const timestamp = new Date();

    this.addMessage({
      role: 'user',
      content: userMessage,
      timestamp,
      attachedFile
    });

    this.addMessage({
      role: 'ai',
      content: aiResponse,
      timestamp
    });
  }

  clear(): void {
    this.history = [];
  }

  getHistoryStatus(): { count: number; totalChars: number } {
    const totalChars = this.history.reduce((sum, msg) => sum + msg.content.length, 0);
    return {
      count: this.history.length,
      totalChars
    };
  }

  private trimHistory(): void {
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }
}
