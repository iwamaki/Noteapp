import { Note } from '@shared/types/note';
import { LLMCommand, LLMResponse } from './llmService';
import { DraftNote } from '../store/note/noteDraftStore'; // Import DraftNote

type EventMap = {
  'note:created': { note: Note };
  'note:updated': { note: Note; previousState?: Note };
  'note:deleted': { noteId: string };
  'note:selected': { noteId: string | null };
  'notes:bulk-deleted': { noteIds: string[] };
  'notes:bulk-copied': { sourceIds: string[]; newNotes: Note[] };
  'draft:saved': { note: Note };
  'draft:save-requested': { draftNote: DraftNote; activeNoteId: string | null }; // New event
  'llm:command-received': { commands: LLMCommand[] };
  'llm:response-processed': { response: LLMResponse };
  'sync:requested': { source: string };
  'error:occurred': { error: Error; context: string };
};

class EventBus {
  private listeners = new Map<keyof EventMap, Set<Function>>();
  private eventQueue: Array<{ type: keyof EventMap; payload: any }> = [];
  private isProcessing = false;

  on<K extends keyof EventMap>(
    event: K,
    handler: (payload: EventMap[K]) => void | Promise<void>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    // クリーンアップ関数を返す
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  async emit<K extends keyof EventMap>(
    event: K,
    payload: EventMap[K]
  ): Promise<void> {
    // イベントをキューに追加
    this.eventQueue.push({ type: event, payload });
    
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    
    while (this.eventQueue.length > 0) {
      const { type, payload } = this.eventQueue.shift()!;
      const handlers = this.listeners.get(type);
      
      if (handlers) {
        // 並列実行を避け、順次実行で予測可能性を確保
        for (const handler of handlers) {
          try {
            await handler(payload);
          } catch (error) {
            console.error(`Event handler error for ${type}:`, error);
            // エラーイベントを発火（無限ループ防止のため type !== 'error:occurred' をチェック）
            if (type !== 'error:occurred') {
              this.eventQueue.push({
                type: 'error:occurred',
                payload: { error, context: type }
              });
            }
          }
        }
      }
    }
    
    this.isProcessing = false;
  }

  // デバッグ用：現在のリスナー状況を確認
  getListenerStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.listeners.forEach((handlers, event) => {
      stats[event] = handlers.size;
    });
    return stats;
  }
}

export const eventBus = new EventBus();
