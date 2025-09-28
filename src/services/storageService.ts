// 修正版 storageService.ts - 一貫性のあるストレージ実装
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

// 型定義を明確に
export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  tags?: string[];
}

export interface CreateNoteData {
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateNoteData {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
}

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

  static convertDates(note: any): Note {
    return {
      ...note,
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt),
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

/**
 * ノートストレージサービス
 * 一貫性のある配列ベースの実装
 */
export class NoteStorageService {
  private static async getAllNotesRaw(): Promise<Note[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      const notes = await StorageUtils.safeJsonParse<any[]>(jsonValue);
      
      if (!notes) return [];
      
      return notes.map(StorageUtils.convertDates);
    } catch (error) {
      throw new StorageError('Failed to retrieve notes', 'FETCH_ERROR');
    }
  }

  private static async saveAllNotes(notes: Note[]): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      throw new StorageError('Failed to save notes', 'SAVE_ERROR');
    }
  }

  static async getAllNotes(): Promise<Note[]> {
    const notes = await this.getAllNotesRaw();
    return notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

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

  static async deleteNote(id: string): Promise<void> {
    const notes = await this.getAllNotesRaw();
    const filteredNotes = notes.filter(note => note.id !== id);
    
    if (filteredNotes.length === notes.length) {
      throw new StorageError(`Note with id ${id} not found`, 'NOT_FOUND');
    }
    
    await this.saveAllNotes(filteredNotes);
  }

  static async searchNotes(query: string): Promise<Note[]> {
    const notes = await this.getAllNotes();
    const searchTerm = query.toLowerCase();
    
    return notes.filter(note => 
      note.title.toLowerCase().includes(searchTerm) ||
      note.content.toLowerCase().includes(searchTerm) ||
      note.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  static async clearAllNotes(): Promise<void> {
    await AsyncStorage.removeItem(NOTES_STORAGE_KEY);
  }
}

