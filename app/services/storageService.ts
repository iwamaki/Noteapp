/**
 * @file storageService.ts
 * @summary このファイルは、アプリケーションの永続的なデータストレージを管理するためのサービスを提供します。
 * ノートの作成、取得、更新、削除、およびバージョン管理機能を含みます。
 * @responsibility AsyncStorageを利用してノートデータとノートのバージョン履歴を保存・管理し、データの整合性を保ちながら、
 * ノートのライフサイクル全体にわたる操作（CRUD、バージョン復元、検索など）を安全かつ効率的に実行します。
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Note, NoteVersion, CreateNoteData, UpdateNoteData } from '../../shared/types/note';





const NOTES_STORAGE_KEY = '@notes';
const NOTE_VERSIONS_STORAGE_KEY = '@note_versions';

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

// ノートストレージサービス
export class NoteStorageService {
  // --- Private Raw Note Methods ---
  private static async getAllNotesRaw(): Promise<Note[]> {
    try {
      console.log('[DEBUG] Getting all notes from AsyncStorage');
      const jsonValue = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      console.log('[DEBUG] AsyncStorage returned:', jsonValue ? `${jsonValue.length} chars` : 'null');
      const notes = await StorageUtils.safeJsonParse<any[]>(jsonValue);
      if (!notes) return [];
      console.log('[DEBUG] Parsed notes count:', notes.length);
      return notes.map(note => StorageUtils.convertDates(note) as Note);
    } catch (error) {
      console.error('[DEBUG] Failed to get notes from AsyncStorage:', error);
      throw new StorageError('Failed to retrieve notes', 'FETCH_ERROR');
    }
  }

  private static async saveAllNotes(notes: Note[]): Promise<void> {
    try {
      console.log('[DEBUG] Saving notes to AsyncStorage:', notes.length, 'notes');
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
      console.log('[DEBUG] Successfully saved notes to AsyncStorage');
    } catch (error) {
      console.error('[DEBUG] Failed to save notes to AsyncStorage:', error);
      throw new StorageError('Failed to save notes', 'SAVE_ERROR');
    }
  }

  // --- Private Raw Version Methods ---
  private static async getAllVersionsRaw(): Promise<NoteVersion[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTE_VERSIONS_STORAGE_KEY);
      const versions = await StorageUtils.safeJsonParse<any[]>(jsonValue);
      if (!versions) return [];
      return versions.map(version => StorageUtils.convertDates(version) as NoteVersion);
    } catch {
      throw new StorageError('Failed to retrieve note versions', 'FETCH_VERSIONS_ERROR');
    }
  }

  private static async saveAllVersions(versions: NoteVersion[]): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTE_VERSIONS_STORAGE_KEY, JSON.stringify(versions));
    } catch {
      throw new StorageError('Failed to save note versions', 'SAVE_VERSIONS_ERROR');
    }
  }

  // --- Public Note Methods ---
  static async getAllNotes(): Promise<Note[]> {
    const notes = await this.getAllNotesRaw();
    return notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  static async getNoteById(id: string): Promise<Note | null> {
    const notes = await this.getAllNotesRaw();
    return notes.find(note => note.id === id) || null;
  }

  static async createNote(data: CreateNoteData): Promise<Note> {
    console.log('[DEBUG] createNote called with data:', data);
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
    console.log('[DEBUG] Current notes before create:', notes.length);
    notes.push(newNote);
    await this.saveAllNotes(notes);
    console.log('[DEBUG] Note created successfully:', newNote.id);

    // Create initial version
    const initialVersion: NoteVersion = {
      id: uuidv4(),
      noteId: newNote.id,
      content: newNote.content,
      version: newNote.version,
      createdAt: newNote.createdAt,
    };
    const versions = await this.getAllVersionsRaw();
    versions.push(initialVersion);
    await this.saveAllVersions(versions);

    return newNote;
  }

  static async updateNote(data: UpdateNoteData): Promise<Note> {
    console.log('[DEBUG] updateNote called with data:', data);
    const notes = await this.getAllNotesRaw();
    const index = notes.findIndex(note => note.id === data.id);

    if (index === -1) {
      throw new StorageError(`Note with id ${data.id} not found`, 'NOT_FOUND');
    }

    const existingNote = notes[index];
    console.log('[DEBUG] Updating existing note:', existingNote.id);

    // Save current state as a new version before updating
    const newVersionForOldState: NoteVersion = {
      id: uuidv4(),
      noteId: existingNote.id,
      content: existingNote.content,
      version: existingNote.version,
      createdAt: existingNote.updatedAt, // Use updatedAt as the creation time for this version
    };
    const versions = await this.getAllVersionsRaw();
    versions.push(newVersionForOldState);
    await this.saveAllVersions(versions);

    const updatedNote: Note = {
      ...existingNote,
      ...data,
      updatedAt: new Date(),
      version: existingNote.version + 1,
    };

    notes[index] = updatedNote;
    await this.saveAllNotes(notes);
    console.log('[DEBUG] Note updated successfully:', updatedNote.id);

    return updatedNote;
  }

  static async deleteNote(id: string): Promise<void> {
    const notes = await this.getAllNotesRaw();
    const filteredNotes = notes.filter(note => note.id !== id);
    
    if (filteredNotes.length === notes.length) {
      throw new StorageError(`Note with id ${id} not found`, 'NOT_FOUND');
    }
    
    await this.saveAllNotes(filteredNotes);

    // Delete associated versions
    const allVersions = await this.getAllVersionsRaw();
    const filteredVersions = allVersions.filter(version => version.noteId !== id);
    await this.saveAllVersions(filteredVersions);
  }

  // --- Public Version Methods ---
  static async getNoteVersions(noteId: string): Promise<NoteVersion[]> {
    const allVersions = await this.getAllVersionsRaw();
    return allVersions
      .filter(version => version.noteId === noteId)
      .sort((a, b) => b.version - a.version);
  }

  static async getNoteVersion(versionId: string): Promise<NoteVersion | null> {
    const allVersions = await this.getAllVersionsRaw();
    return allVersions.find(version => version.id === versionId) || null;
  }

  static async restoreNoteVersion(noteId: string, versionId: string): Promise<Note> {
    const versionToRestore = await this.getNoteVersion(versionId);
    if (!versionToRestore || versionToRestore.noteId !== noteId) {
      throw new StorageError(`Version with id ${versionId} for note ${noteId} not found`, 'VERSION_NOT_FOUND');
    }

    const note = await this.getNoteById(noteId);
    if (!note) {
      throw new StorageError(`Note with id ${noteId} not found`, 'NOT_FOUND');
    }

    // Update the note with the content from the version to restore
    // This will automatically create a new version of the state *before* restoration
    return this.updateNote({
      id: noteId,
      content: versionToRestore.content,
      // We might not want to change the title when restoring content,
      // but this can be decided based on product requirements.
      // title: note.title 
    });
  }

  // --- Utility Methods ---
  static async searchNotes(query: string): Promise<Note[]> {
    const notes = await this.getAllNotes();
    const searchTerm = query.toLowerCase();
    
    return notes.filter(note => 
      note.title.toLowerCase().includes(searchTerm) ||
      note.content.toLowerCase().includes(searchTerm) ||
      note.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  static async clearAllData(): Promise<void> {
    await AsyncStorage.removeItem(NOTES_STORAGE_KEY);
    await AsyncStorage.removeItem(NOTE_VERSIONS_STORAGE_KEY);
  }
}