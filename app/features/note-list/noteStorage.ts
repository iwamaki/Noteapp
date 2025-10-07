import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Note, CreateNoteData } from '../../../shared/types/note';

const NOTES_STORAGE_KEY = '@notes';

import StorageUtils from '../../shared/storage/asyncStorageUtils';

// エラークラス
export class StorageError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'StorageError';
  }
}

export class NoteListStorage {
  private static async getAllNotesRaw(): Promise<Note[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
      const notes = await StorageUtils.safeJsonParse<any[]>(jsonValue);
      if (!notes) return [];
      return notes.map(note => StorageUtils.convertDates(note) as Note);
    } catch {
      throw new StorageError('Failed to retrieve notes', 'FETCH_ERROR');
    }
  }

  private static async saveAllNotes(notes: Note[]): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {
      throw new StorageError('Failed to save notes', 'SAVE_ERROR');
    }
  }

  static async getAllNotes(): Promise<Note[]> {
    const notes = await this.getAllNotesRaw();
    return notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  static async deleteNotes(noteIds: string[]): Promise<void> {
    let notes = await this.getAllNotesRaw();
    const initialLength = notes.length;
    notes = notes.filter(note => !noteIds.includes(note.id));
    if (notes.length === initialLength) {
      // None of the notes were found, or no notes were provided
      // Depending on requirements, this might throw an error or just do nothing.
      // For now, we'll assume it's okay if no notes are found to delete.
    }
    await this.saveAllNotes(notes);
  }

  static async copyNotes(sourceIds: string[]): Promise<Note[]> {
    const notes = await this.getAllNotesRaw();
    const copiedNotes: Note[] = [];
    const now = new Date();

    for (const id of sourceIds) {
      const noteToCopy = notes.find(note => note.id === id);
      if (noteToCopy) {
        const newNote: Note = {
          ...noteToCopy,
          id: uuidv4(), // Generate a new ID for the copied note
          createdAt: now,
          updatedAt: now,
          title: `Copy of ${noteToCopy.title}`, // Prefix title with "Copy of"
          version: 1, // Reset version for copied note
        };
        copiedNotes.push(newNote);
      }
    }

    if (copiedNotes.length > 0) {
      await this.saveAllNotes([...notes, ...copiedNotes]);
    }
    return copiedNotes;
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
}
