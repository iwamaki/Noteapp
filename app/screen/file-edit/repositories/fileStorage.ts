import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { File, FileVersion, CreateFileData, UpdateFileData } from '../../../../shared/types/file';

const FILES_STORAGE_KEY = '@files';
const FILE_VERSIONS_STORAGE_KEY = '@file_versions';

import StorageUtils from '@data/asyncStorageUtils';

// エラークラス
export class StorageError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'StorageError';
  }
}

// ファイルストレージサービス (file-edit feature specific)
export class FileEditStorage {
  // --- Private Raw File Methods ---
  private static async getAllFilesRaw(): Promise<File[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(FILES_STORAGE_KEY);
      const files = await StorageUtils.safeJsonParse<any[]>(jsonValue);
      if (!files) return [];
      return files.map(file => StorageUtils.convertDates(file) as File);
    } catch (error) {
      console.error('Failed to get files from AsyncStorage:', error);
      throw new StorageError('Failed to retrieve files', 'FETCH_ERROR');
    }
  }

  private static async saveAllFiles(files: File[]): Promise<void> {
    try {
      await AsyncStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
    } catch (error) {
      console.error('Failed to save files to AsyncStorage:', error);
      throw new StorageError('Failed to save files', 'SAVE_ERROR');
    }
  }

  // --- Private Raw Version Methods ---
  private static async getAllVersionsRaw(): Promise<FileVersion[]> {
    try {
      const jsonValue = await AsyncStorage.getItem(FILE_VERSIONS_STORAGE_KEY);
      const versions = await StorageUtils.safeJsonParse<any[]>(jsonValue);
      if (!versions) return [];
      return versions.map(version => StorageUtils.convertDates(version) as FileVersion);
    } catch (error) {
      console.error('Failed to retrieve file versions from AsyncStorage:', error);
      throw new StorageError('Failed to retrieve file versions', 'FETCH_VERSIONS_ERROR');
    }
  }

  private static async saveAllVersions(versions: FileVersion[]): Promise<void> {
    try {
      await AsyncStorage.setItem(FILE_VERSIONS_STORAGE_KEY, JSON.stringify(versions));
    } catch (error) {
      console.error('Failed to save file versions to AsyncStorage:', error);
      throw new StorageError('Failed to save file versions', 'SAVE_VERSIONS_ERROR');
    }
  }

  // --- Public File Methods for file-edit ---
  static async getFileById(id: string): Promise<File | null> {
    const files = await this.getAllFilesRaw();
    return files.find(file => file.id === id) || null;
  }

  static async createFile(data: CreateFileData): Promise<File> {
    const now = new Date();
    const newFile: File = {
      id: uuidv4(),
      title: data.title,
      content: data.content,
      tags: data.tags || [],
      path: data.path || '/',
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    const files = await this.getAllFilesRaw();
    files.push(newFile);
    await this.saveAllFiles(files);

    // Create initial version
    const initialVersion: FileVersion = {
      id: uuidv4(),
      fileId: newFile.id,
      content: newFile.content,
      version: newFile.version,
      createdAt: newFile.createdAt,
    };
    const versions = await this.getAllVersionsRaw();
    versions.push(initialVersion);
    await this.saveAllVersions(versions);

    return newFile;
  }

  static async updateFile(data: UpdateFileData): Promise<File> {
    const files = await this.getAllFilesRaw();
    const index = files.findIndex(file => file.id === data.id);

    if (index === -1) {
      throw new StorageError(`File with id ${data.id} not found`, 'NOT_FOUND');
    }

    const existingFile = files[index];

    // Save current state as a new version before updating
    const newVersionForOldState: FileVersion = {
      id: uuidv4(),
      fileId: existingFile.id,
      content: existingFile.content,
      version: existingFile.version,
      createdAt: existingFile.updatedAt, // Use updatedAt as the creation time for this version
    };
    const versions = await this.getAllVersionsRaw();
    versions.push(newVersionForOldState);
    await this.saveAllVersions(versions);

    const updatedFile: File = {
      ...existingFile,
      ...data,
      updatedAt: new Date(),
      version: existingFile.version + 1,
    };

    files[index] = updatedFile;
    await this.saveAllFiles(files);

    return updatedFile;
  }

  // --- Public Version Methods for file-edit ---
  static async getFileVersions(fileId: string): Promise<FileVersion[]> {
    const allVersions = await this.getAllVersionsRaw();
    return allVersions.filter(version => version.fileId === fileId);
  }

  static async getFileVersion(versionId: string): Promise<FileVersion | null> {
    const allVersions = await this.getAllVersionsRaw();
    return allVersions.find(version => version.id === versionId) || null;
  }

  static async restoreFileVersion(fileId: string, versionId: string): Promise<File> {
    const versionToRestore = await this.getFileVersion(versionId);
    if (!versionToRestore || versionToRestore.fileId !== fileId) {
      throw new StorageError(`Version with id ${versionId} for file ${fileId} not found`, 'VERSION_NOT_FOUND');
    }

    const file = await this.getFileById(fileId);
    if (!file) {
      throw new StorageError(`File with id ${fileId} not found`, 'NOT_FOUND');
    }

    // Update the file with the content from the version to restore
    // This will automatically create a new version of the state *before* restoration
    return this.updateFile({
      id: fileId,
      content: versionToRestore.content,
      // We might not want to change the title when restoring content,
      // but this can be decided based on product requirements.
      // title: file.title 
    });
  }
}
