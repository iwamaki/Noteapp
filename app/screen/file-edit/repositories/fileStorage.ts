import { v4 as uuidv4 } from 'uuid';
import { File, FileVersion, CreateFileData, UpdateFileData } from '../../../../shared/types/file';
import {
  getAllFilesRaw,
  saveAllFiles,
  getAllVersionsRaw,
  saveAllVersions,
  StorageError,
} from '@data/storageService';

// Re-export StorageError for consumers
export { StorageError };

// ファイルストレージサービス (file-edit feature specific)
export class FileEditStorage {
  // --- Public File Methods for file-edit ---
  static async getFileById(id: string): Promise<File | null> {
    const files = await getAllFilesRaw();
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

    const files = await getAllFilesRaw();
    files.push(newFile);
    await saveAllFiles(files);

    // Create initial version
    const initialVersion: FileVersion = {
      id: uuidv4(),
      fileId: newFile.id,
      content: newFile.content,
      version: newFile.version,
      createdAt: newFile.createdAt,
    };
    const versions = await getAllVersionsRaw();
    versions.push(initialVersion);
    await saveAllVersions(versions);

    return newFile;
  }

  static async updateFile(data: UpdateFileData): Promise<File> {
    const files = await getAllFilesRaw();
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
    const versions = await getAllVersionsRaw();
    versions.push(newVersionForOldState);
    await saveAllVersions(versions);

    const updatedFile: File = {
      ...existingFile,
      ...data,
      updatedAt: new Date(),
      version: existingFile.version + 1,
    };

    files[index] = updatedFile;
    await saveAllFiles(files);

    return updatedFile;
  }

  // --- Public Version Methods for file-edit ---
  static async getFileVersions(fileId: string): Promise<FileVersion[]> {
    const allVersions = await getAllVersionsRaw();
    return allVersions.filter(version => version.fileId === fileId);
  }

  static async getFileVersion(versionId: string): Promise<FileVersion | null> {
    const allVersions = await getAllVersionsRaw();
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
