import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { File, FileVersion, CreateFileData, UpdateFileData } from '../../../../shared/types/file';

const NOTES_STORAGE_KEY = '@notes';
const NOTE_VERSIONS_STORAGE_KEY = '@note_versions';

import StorageUtils from '@data/asyncStorageUtils';

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
  private static async getAllNotesRaw(): Promise<File[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      const notes = await StorageUtils.safeJsonParse<any[]>(jsonValue);
      if (!notes) return [];
      return notes.map(note => StorageUtils.convertDates(note) as File);
    } catch (error) {
      console.error('Failed to get notes from AsyncStorage:', error);
      throw new StorageError('Failed to retrieve notes', 'FETCH_ERROR');
    }
  }

  private static async saveAllNotes(notes: File[]): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch (error) {
      console.error('Failed to save notes to AsyncStorage:', error);
      throw new StorageError('Failed to save notes', 'SAVE_ERROR');
    }
  }

  // --- Private Raw Version Methods ---
  private static async getAllVersionsRaw(): Promise<FileVersion[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTE_VERSIONS_STORAGE_KEY);
      const versions = await StorageUtils.safeJsonParse<any[]>(jsonValue);
      if (!versions) return [];
      return versions.map(version => StorageUtils.convertDates(version) as FileVersion);
    } catch (error) {
      console.error('Failed to retrieve note versions from AsyncStorage:', error);
      throw new StorageError('Failed to retrieve note versions', 'FETCH_VERSIONS_ERROR');
    }
  }

  private static async saveAllVersions(versions: FileVersion[]): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTE_VERSIONS_STORAGE_KEY, JSON.stringify(versions));
    } catch (error) {
      console.error('Failed to save note versions to AsyncStorage:', error);
      throw new StorageError('Failed to save note versions', 'SAVE_VERSIONS_ERROR');
    }
  }

  // --- Public Note Methods for note-edit ---
  static async getNoteById(id: string): Promise<File | null> {
    const notes = await this.getAllNotesRaw();
    return notes.find(note => note.id === id) || null;
  }

  static async createNote(data: CreateFileData): Promise<File> {
    const now = new Date();
    const newNote: File = {
      id: uuidv4(),
      title: data.title,
      content: data.content,
      tags: data.tags || [],
      path: data.path || '/',
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    const notes = await this.getAllNotesRaw();
    notes.push(newNote);
    await this.saveAllNotes(notes);

    // Create initial version
    const initialVersion: FileVersion = {
      id: uuidv4(),
      fileId: newNote.id,
      content: newNote.content,
      version: newNote.version,
      createdAt: newNote.createdAt,
    };
    const versions = await this.getAllVersionsRaw();
    versions.push(initialVersion);
    await this.saveAllVersions(versions);

    return newNote;
  }

  static async updateNote(data: UpdateFileData): Promise<File> {
    const notes = await this.getAllNotesRaw();
    const index = notes.findIndex(note => note.id === data.id);

    if (index === -1) {
      throw new StorageError(`Note with id ${data.id} not found`, 'NOT_FOUND');
    }

    const existingNote = notes[index];

    // Save current state as a new version before updating
    const newVersionForOldState: FileVersion = {
      id: uuidv4(),
      fileId: existingNote.id,
      content: existingNote.content,
      version: existingNote.version,
      createdAt: existingNote.updatedAt, // Use updatedAt as the creation time for this version
    };
    const versions = await this.getAllVersionsRaw();
    versions.push(newVersionForOldState);
    await this.saveAllVersions(versions);

    const updatedNote: File = {
      ...existingNote,
      ...data,
      updatedAt: new Date(),
      version: existingNote.version + 1,
    };

    notes[index] = updatedNote;
    await this.saveAllNotes(notes);

    return updatedNote;
  }

  // --- Public Version Methods for note-edit ---
  static async getNoteVersions(noteId: string): Promise<FileVersion[]> {
    const allVersions = await this.getAllVersionsRaw();
    return allVersions.filter(version => version.fileId === noteId);
  }

  static async getNoteVersion(versionId: string): Promise<FileVersion | null> {
    const allVersions = await this.getAllVersionsRaw();
    return allVersions.find(version => version.id === versionId) || null;
  }

  static async restoreNoteVersion(noteId: string, versionId: string): Promise<File> {
    const versionToRestore = await this.getNoteVersion(versionId);
    if (!versionToRestore || versionToRestore.fileId !== noteId) {
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
}
