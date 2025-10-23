import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Folder, FileVersion } from '@shared/types/file';
import StorageUtils from './asyncStorageUtils';

// --- Storage Keys ---
export const STORAGE_KEYS = {
  FILES: '@files',
  FOLDERS: '@folders',
  FILE_VERSIONS: '@file_versions',
} as const;

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
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.FILES);
    const files = await StorageUtils.safeJsonParse<any[]>(jsonValue);
    if (!files) return [];
    return files.map(file => StorageUtils.convertDates(file) as File);
  } catch (e) {
    throw new StorageError('Failed to retrieve files', 'FETCH_ERROR', e);
  }
};

export const saveAllFiles = async (files: File[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
  } catch (e) {
    throw new StorageError('Failed to save files', 'SAVE_ERROR', e);
  }
};

// --- Raw Folder Methods ---
export const getAllFoldersRaw = async (): Promise<Folder[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.FOLDERS);
    const folders = await StorageUtils.safeJsonParse<any[]>(jsonValue);
    if (!folders) return [];
    return folders.map(folder => StorageUtils.convertDates(folder) as Folder);
  } catch (e) {
    throw new StorageError('Failed to retrieve folders', 'FETCH_FOLDERS_ERROR', e);
  }
};

export const saveAllFolders = async (folders: Folder[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  } catch (e) {
    throw new StorageError('Failed to save folders', 'SAVE_FOLDERS_ERROR', e);
  }
};

// --- Raw File Version Methods ---
export const getAllVersionsRaw = async (): Promise<FileVersion[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.FILE_VERSIONS);
    const versions = await StorageUtils.safeJsonParse<any[]>(jsonValue);
    if (!versions) return [];
    return versions.map(version => StorageUtils.convertDates(version) as FileVersion);
  } catch (e) {
    throw new StorageError('Failed to retrieve file versions', 'FETCH_VERSIONS_ERROR', e);
  }
};

export const saveAllVersions = async (versions: FileVersion[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FILE_VERSIONS, JSON.stringify(versions));
  } catch (e) {
    throw new StorageError('Failed to save file versions', 'SAVE_VERSIONS_ERROR', e);
  }
};
