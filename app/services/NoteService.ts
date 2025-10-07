import { Note } from '../../shared/types/note';
import { NoteActionService } from './NoteActionService';
import { eventBus } from './eventBus';

// app/services/NoteService.ts
class NoteService {
  constructor() {
    // 初期化処理
  }

  async bulkDeleteNotes(noteIds: string[]): Promise<void> {
    try {
      await NoteActionService.bulkDeleteNotes(noteIds);
    } catch (error) {
      console.error('Failed to bulk delete notes:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'bulk-delete-notes' });
      throw error;
    }
  }

  async bulkCopyNotes(sourceIds: string[]): Promise<Note[]> {
    try {
      const newNotes = await NoteActionService.bulkCopyNotes(sourceIds);
      return newNotes;
    } catch (error) {
      console.error('Failed to bulk copy notes:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'bulk-copy-notes' });
      throw error;
    }
  }

  // 今後、ノート関連のビジネスロジックをここに追加
}

export const noteService = new NoteService();