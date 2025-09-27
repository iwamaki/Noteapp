import AsyncStorage from '@react-native-async-storage/async-storage';
import { Note } from '../../shared/types/note';
import { v4 as uuidv4 } from 'uuid';

const NOTE_STORAGE_PREFIX = '@note:';

/**
 * Saves a single note to AsyncStorage.
 * @param note The note object to save or update.
 * @returns The complete saved note object.
 */
export const saveNote = async (note: Note): Promise<Note> => {
  try {
    // 既存のノート一覧を取得
    const notes = await getAllNotes();
    
    // 指定されたIDのノートが存在するか確認
    const existingIndex = notes.findIndex(n => n.id === note.id);
    
    if (existingIndex >= 0) {
      // 既存のノートを更新
      notes[existingIndex] = note;
    } else {
      // 新規ノートを追加
      notes.push(note);
    }
    
    // 更新されたノート一覧を保存
    await AsyncStorage.setItem('notes', JSON.stringify(notes));
    return note;
  } catch (error) {
    console.error('Failed to save note:', error);
    throw new Error('Failed to save the note.');
  }
};

/**
 * Retrieves a single note by its ID.
 * @param id The ID of the note to retrieve.
 * @returns The note object or null if not found.
 */
export const getNoteById = async (id: string): Promise<Note | null> => {
  try {
    const key = `${NOTE_STORAGE_PREFIX}${id}`;
    const jsonValue = await AsyncStorage.getItem(key);
    // Dates will be string, so we need to convert them back
    if (jsonValue != null) {
      const parsed = JSON.parse(jsonValue);
      return {
        ...parsed,
        createdAt: new Date(parsed.createdAt),
        updatedAt: new Date(parsed.updatedAt),
      };
    }
    return null;
  } catch (e) {
    console.error('Failed to fetch the note.', e);
    throw new Error('Failed to fetch the note.');
  }
};

/**
 * Retrieves all notes from AsyncStorage.
 * @returns An array of all notes.
 */
export const getAllNotes = async (): Promise<Note[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const noteKeys = keys.filter(key => key.startsWith(NOTE_STORAGE_PREFIX));
    if (noteKeys.length === 0) {
      return [];
    }
    const items = await AsyncStorage.multiGet(noteKeys);
    const notes = items.map(([key, value]) => {
      if (value != null) {
        const parsed = JSON.parse(value);
        // Dates will be string, so we need to convert them back
        return {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          updatedAt: new Date(parsed.updatedAt),
        } as Note;
      }
      return null;
    }).filter((note): note is Note => note !== null);
    
    // Sort notes by update date, newest first
    return notes.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  } catch (e) {
    console.error('Failed to fetch all notes.', e);
    throw new Error('Failed to fetch all notes.');
  }
};

/**
 * Deletes a note by its ID.
 * @param id The ID of the note to delete.
 */
export const deleteNoteById = async (id: string): Promise<void> => {
  try {
    const key = `${NOTE_STORAGE_PREFIX}${id}`;
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.error('Failed to delete the note.', e);
    throw new Error('Failed to delete the note.');
  }
};
