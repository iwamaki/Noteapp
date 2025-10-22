import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Folder } from '@shared/types/file';
import StorageUtils from '@data/asyncStorageUtils';

const NOTES_STORAGE_KEY = '@notes';
const FOLDERS_STORAGE_KEY = '@folders';

// --- Error Class ---
export class StorageError extends Error {
  constructor(message: string, public code: string, public originalError?: any) {
    super(message);
    this.name = 'StorageError';
  }
}

// --- Raw Note Methods ---
export const getAllNotesRaw = async (): Promise<File[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
    const notes = await StorageUtils.safeJsonParse<any[]>(jsonValue);
    if (!notes) return [];
    return notes.map(note => StorageUtils.convertDates(note) as File);
  } catch (e) {
    throw new StorageError('Failed to retrieve notes', 'FETCH_ERROR', e);
  }
};

export const saveAllNotes = async (notes: File[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    throw new StorageError('Failed to save notes', 'SAVE_ERROR', e);
  }
};

// --- Raw Folder Methods ---
export const getAllFoldersRaw = async (): Promise<Folder[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(FOLDERS_STORAGE_KEY);
    const folders = await StorageUtils.safeJsonParse<any[]>(jsonValue);
    if (!folders) return [];
    return folders.map(folder => StorageUtils.convertDates(folder) as Folder);
  } catch (e) {
    throw new StorageError('Failed to retrieve folders', 'FETCH_FOLDERS_ERROR', e);
  }
};

export const saveAllFolders = async (folders: Folder[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch (e) {
    throw new StorageError('Failed to save folders', 'SAVE_FOLDERS_ERROR', e);
  }
};
