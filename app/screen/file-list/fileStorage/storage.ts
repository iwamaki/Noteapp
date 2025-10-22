import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Folder } from '@shared/types/file';
import StorageUtils from '@data/asyncStorageUtils';

const FILES_STORAGE_KEY = '@files';
const FOLDERS_STORAGE_KEY = '@folders';

// --- Error Class ---
export class StorageError extends Error {
  constructor(message: string, public code: string, public originalError?: any) {
    super(message);
    this.name = 'StorageError';
  }
}

// --- Raw File Methods ---
export const getAllFilesRaw = async (): Promise<File[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(FILES_STORAGE_KEY);
    const files = await StorageUtils.safeJsonParse<any[]>(jsonValue);
    if (!files) return [];
    return files.map(file => StorageUtils.convertDates(file) as File);
  } catch (e) {
    throw new StorageError('Failed to retrieve files', 'FETCH_ERROR', e);
  }
};

export const saveAllFiles = async (files: File[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
  } catch (e) {
    throw new StorageError('Failed to save files', 'SAVE_ERROR', e);
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
