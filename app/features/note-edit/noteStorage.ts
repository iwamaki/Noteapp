import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Note, CreateNoteData, UpdateNoteData } from '../../../shared/types/note';

const NOTES_STORAGE_KEY = '@notes';

// パフォーマンス向上のためのユーティリティ
class StorageUtils {
  static async safeJsonParse<T>(jsonString: string | null): Promise<T | null> {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('JSON parse error:', error);
      return null;
    }
  }

  static convertDates(item: any): any {
    return {
      ...item,
      createdAt: new Date(item.createdAt),
      ...(item.updatedAt && { updatedAt: new Date(item.updatedAt) }),
    };
  }
}

// エラークラス
export class StorageError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'StorageError';
  }
}

// ノートストレージサービス (note-edit feature specific)
export class NoteEditStorage {
  // --- Private Raw Note Methods ---
  private static async getAllNotesRaw(): Promise<Note[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      const notes = await StorageUtils.safeJsonParse<any[]>(jsonValue);
      if (!notes) return [];
      return notes.map(note => StorageUtils.convertDates(note) as Note);
    } catch (error) {
      console.error('Failed to get notes from AsyncStorage:', error);
      throw new StorageError('Failed to retrieve notes', 'FETCH_ERROR');
    }
  }

  private static async saveAllNotes(notes: Note[]): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error('Failed to save notes to AsyncStorage:', error);
      throw new StorageError('Failed to save notes', 'SAVE_ERROR');
    }
  }

  // --- Public Note Methods for note-edit ---
  static async getNoteById(id: string): Promise<Note | null> {
    const notes = await this.getAllNotesRaw();
    return notes.find(note => note.id === id) || null;
  }

  static async createNote(data: CreateNoteData): Promise<Note> {
    const now = new Date();
    const newNote: Note = {
      id: uuidv4(),
      title: data.title,
      content: data.content,
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    const notes = await this.getAllNotesRaw();
    notes.push(newNote);
    await this.saveAllNotes(notes);

    // For note-edit, we don't manage versions here directly as per current instruction.
    // Versioning will be handled by the feature itself or a dedicated versioning module if needed.

    return newNote;
  }

  static async updateNote(data: UpdateNoteData): Promise<Note> {
    const notes = await this.getAllNotesRaw();
    const index = notes.findIndex(note => note.id === data.id);

    if (index === -1) {
      throw new StorageError(`Note with id ${data.id} not found`, 'NOT_FOUND');
    }

    const existingNote = notes[index];

    const updatedNote: Note = {
      ...existingNote,
      ...data,
      updatedAt: new Date(),
      version: existingNote.version + 1,
    };

    notes[index] = updatedNote;
    await this.saveAllNotes(notes);

    return updatedNote;
  }
}
