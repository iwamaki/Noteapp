import { Note, CreateNoteData, UpdateNoteData } from '../../shared/types/note';
import { NoteActionService } from './NoteActionService';
import { eventBus } from './eventBus';
import { DraftNote } from '../store/note/noteDraftStore';
import { NoteStorageService } from './storageService';
import { commandExecutor, CreateNoteCommand, UpdateNoteCommand, DeleteNoteCommand } from './commandExecutor';

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

  async saveDraftNote(draftNote: DraftNote, activeNoteId: string | null): Promise<Note> {
    try {
      const savedNote = await NoteActionService.saveDraftNote(draftNote, activeNoteId);
      return savedNote;
    } catch (error) {
      console.error('Failed to save draft note:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'save-draft-note' });
      throw error;
    }
  }

  async fetchNotes(): Promise<Note[]> {
    try {
      const notes = await NoteStorageService.getAllNotes();
      await eventBus.emit('note:loaded', { notes });
      return notes;
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'fetch-notes' });
      throw error;
    }
  }

  async selectNote(noteId: string | null): Promise<void> {
    try {
      await eventBus.emit('note:selected', { noteId });
    } catch (error) {
      console.error('Failed to select note:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'select-note' });
      throw error;
    }
  }

  async createNote(data: CreateNoteData): Promise<Note> {
    try {
      const command = new CreateNoteCommand(data);
      await commandExecutor.execute(command);
      const createdNote = command.getCreatedNote();
      if (!createdNote) {
        throw new Error('Created note not found after command execution.');
      }
      return createdNote;
    } catch (error) {
      console.error('Failed to create note:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'create-note' });
      throw error;
    }
  }

  async updateNote(noteId: string, updates: Partial<UpdateNoteData>, previousState?: Note): Promise<void> {
    try {
      const command = new UpdateNoteCommand(noteId, updates, previousState);
      await commandExecutor.execute(command);
    } catch (error) {
      console.error('Failed to update note:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'update-note' });
      throw error;
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    try {
      const command = new DeleteNoteCommand(noteId);
      await commandExecutor.execute(command);
    } catch (error) {
      console.error('Failed to delete note:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'delete-note' });
      throw error;
    }
  }

  // 今後、ノート関連のビジネスロジックをここに追加
}

export const noteService = new NoteService();