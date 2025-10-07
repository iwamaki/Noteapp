import { Note, CreateNoteData, UpdateNoteData } from '../../shared/types/note';
import { eventBus } from './eventBus';
import { DraftNote } from '../store/note/noteDraftStore';
import { NoteStorageService, StorageError } from './storageService';

interface Command {
  execute(): Promise<void>;
  undo?(): Promise<void>;
  redo?(): Promise<void>;
}

class UpdateNoteCommand implements Command {
  constructor(
    private noteId: string,
    private updates: Partial<Note>,
    private previousState?: Note
  ) {}

  async execute(): Promise<void> {
    const { id: _id, ...restUpdates } = this.updates; // Destructure to omit 'id'
    const note = await NoteStorageService.updateNote({
      id: this.noteId,
      ...restUpdates // Spread the rest of the updates
    });
    await eventBus.emit('note:updated', { note });
  }

  async undo(): Promise<void> {
    if (this.previousState) {
      const { id: _id, ...restPreviousState } = this.previousState; // Destructure to omit 'id'
      const note = await NoteStorageService.updateNote({
        id: this.noteId,
        ...restPreviousState // Spread the rest of the previous state
      });
      await eventBus.emit('note:updated', { note });
    }
  }
}

class CreateNoteCommand implements Command {
  private createdNote: Note | null = null;

  constructor(private data: CreateNoteData) {}

  async execute(): Promise<void> {
    this.createdNote = await NoteStorageService.createNote(this.data);
    await eventBus.emit('note:created', { note: this.createdNote });
  }

  async undo(): Promise<void> {
    if (this.createdNote) {
      await NoteStorageService.deleteNote(this.createdNote.id);
      await eventBus.emit('note:deleted', { noteId: this.createdNote.id });
    }
  }

  getCreatedNote(): Note | null {
    return this.createdNote;
  }
}

class DeleteNoteCommand implements Command {
  private deletedNote: Note | null = null;

  constructor(private noteId: string) {}

  async execute(): Promise<void> {
    this.deletedNote = await NoteStorageService.getNoteById(this.noteId);
    if (this.deletedNote) {
      await NoteStorageService.deleteNote(this.noteId);
      await eventBus.emit('note:deleted', { noteId: this.noteId });
    }
  }

  async undo(): Promise<void> {
    if (this.deletedNote) {
      const restoredNote = await NoteStorageService.createNote(this.deletedNote);
      await eventBus.emit('note:created', { note: restoredNote });
    }
  }
}

// app/services/NoteService.ts
class NoteService {
  private history: Command[] = [];
  private currentIndex = -1;

  constructor() {
    // 初期化処理
  }

  private async executeCommand(command: Command): Promise<void> {
    await command.execute();
    
    // 新しいコマンドを実行したら、現在位置より後の履歴を削除
    this.history = this.history.slice(0, this.currentIndex + 1);
    this.history.push(command);
    this.currentIndex++;
  }

  async undo(): Promise<void> {
    if (this.currentIndex >= 0 && this.history[this.currentIndex].undo) {
      await this.history[this.currentIndex].undo!();
      this.currentIndex--;
    }
  }

  async redo(): Promise<void> {
    if (this.currentIndex < this.history.length - 1) {
      this.currentIndex++;
      await this.history[this.currentIndex].execute();
    }
  }

  async bulkDeleteNotes(noteIds: string[]): Promise<void> {
    try {
      for (const noteId of noteIds) {
        await NoteStorageService.deleteNote(noteId);
      }
      await eventBus.emit('notes:bulk-deleted', { noteIds });
    } catch (error: any) {
      console.error('Failed to bulk delete notes:', error);
      await eventBus.emit('error:occurred', {
        error: error instanceof StorageError ? error : new Error(error.message),
        context: 'bulk-delete-notes',
      });
      throw error;
    }
  }

  async bulkCopyNotes(sourceIds: string[]): Promise<Note[]> {
    const newNotes: Note[] = [];
    try {
      for (const noteId of sourceIds) {
        const originalNote = await NoteStorageService.getNoteById(noteId);
        if (originalNote) {
          const newNoteData: CreateNoteData = {
            title: `${originalNote.title} (コピー)`,
            content: originalNote.content,
            tags: originalNote.tags,
          };
          const newNote = await NoteStorageService.createNote(newNoteData);
          newNotes.push(newNote);
        }
      }
      await eventBus.emit('notes:bulk-copied', { sourceIds, newNotes });
      return newNotes;
    } catch (error: any) {
      console.error('Failed to bulk copy notes:', error);
      await eventBus.emit('error:occurred', {
        error: error instanceof StorageError ? error : new Error(error.message),
        context: 'bulk-copy-notes',
      });
      throw error;
    }
  }

  async saveDraftNote(draftNote: DraftNote, activeNoteId: string | null): Promise<Note> {
    try {
      let savedNote: Note;
      if (activeNoteId) {
        // 既存のノートを更新
        savedNote = await NoteStorageService.updateNote({
          id: activeNoteId,
          title: draftNote.title,
          content: draftNote.content,
          tags: draftNote.tags,
        });
        await eventBus.emit('note:updated', { note: savedNote });
      } else {
        // 新規ノートを作成
        savedNote = await NoteStorageService.createNote({
          title: draftNote.title,
          content: draftNote.content,
          tags: draftNote.tags,
        });
        await eventBus.emit('note:created', { note: savedNote });
      }
      await eventBus.emit('draft:saved', { note: savedNote });
      return savedNote;
    } catch (error: any) {
      console.error('Failed to save draft note:', error);
      await eventBus.emit('error:occurred', {
        error: error instanceof StorageError ? error : new Error(error.message),
        context: 'save-draft-note',
      });
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
      await this.executeCommand(command);
      const newNote = command.getCreatedNote();
      if (!newNote) {
        throw new Error('Failed to retrieve created note from command.');
      }
      return newNote;
    } catch (error: any) {
      console.error('Failed to create note:', error);
      await eventBus.emit('error:occurred', {
        error: error instanceof StorageError ? error : new Error(error.message),
        context: 'create-note',
      });
      throw error;
    }
  }

  async updateNote(noteId: string, updates: Partial<UpdateNoteData>, previousState?: Note): Promise<void> {
    try {
      const command = new UpdateNoteCommand(noteId, updates, previousState);
      await this.executeCommand(command);
    } catch (error) {
      console.error('Failed to update note:', error);
      await eventBus.emit('error:occurred', { error: error as Error, context: 'update-note' });
      throw error;
    }
  }

  async deleteNote(noteId: string): Promise<void> {
    try {
      const command = new DeleteNoteCommand(noteId);
      await this.executeCommand(command);
    } catch (error: any) {
      console.error('Failed to delete note:', error);
      await eventBus.emit('error:occurred', {
        error: error instanceof StorageError ? error : new Error(error.message),
        context: 'delete-note',
      });
      throw error;
    }
  }

  // 今後、ノート関連のビジネスロジックをここに追加
}

export const noteService = new NoteService();