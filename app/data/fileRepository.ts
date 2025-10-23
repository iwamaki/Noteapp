/**
 * @file fileRepository.ts
 * @summary 統合ファイルリポジトリ
 * @description
 * ファイルおよびファイルバージョンに関するすべてのデータアクセスロジックを一元化。
 * file-listとfile-editの両方の機能を統合。
 */

import { v4 as uuidv4 } from 'uuid';
import { File, FileVersion, CreateFileData, UpdateFileData } from '@shared/types/file';
import {
  getAllFilesRaw,
  saveAllFiles,
  getAllVersionsRaw,
  saveAllVersions,
  StorageError,
} from './storageService';

// Re-export StorageError for consumers
export { StorageError };

/**
 * ファイル更新データ（file-list用）
 */
export interface UpdateFileDataSimple {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  path?: string;
}

/**
 * 統合ファイルリポジトリ
 * ファイルとファイルバージョンのすべてのCRUD操作を提供
 */
export class FileRepository {
  // --- 基本的な取得操作 ---

  /**
   * 全ファイルを取得（更新日時降順）
   */
  static async getAll(): Promise<File[]> {
    const files = await getAllFilesRaw();
    return files.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * 指定パス内のファイルを取得（更新日時降順）
   */
  static async getByPath(path: string): Promise<File[]> {
    const files = await getAllFilesRaw();
    return files
      .filter(file => file.path === path)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * IDでファイルを取得
   */
  static async getById(id: string): Promise<File | null> {
    const files = await getAllFilesRaw();
    return files.find(file => file.id === id) || null;
  }

  /**
   * 複数のファイルをIDで取得
   */
  static async getByIds(fileIds: string[]): Promise<File[]> {
    const allFiles = await getAllFilesRaw();
    return allFiles.filter(file => fileIds.includes(file.id));
  }

  // --- 作成・更新操作 ---

  /**
   * ファイルを作成（バージョン管理なし）
   * file-list用
   */
  static async create(data: CreateFileData): Promise<File> {
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
    return newFile;
  }

  /**
   * ファイルを作成（バージョン管理あり）
   * file-edit用
   */
  static async createWithVersion(data: CreateFileData): Promise<File> {
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

  /**
   * ファイルを更新（シンプル版、file-list用）
   */
  static async update(data: UpdateFileDataSimple): Promise<File> {
    const files = await getAllFilesRaw();
    const fileIndex = files.findIndex(n => n.id === data.id);

    if (fileIndex === -1) {
      throw new StorageError(`File with id ${data.id} not found`, 'NOT_FOUND');
    }

    const existingFile = files[fileIndex];
    const updatedFile = {
      ...existingFile,
      ...data,
      updatedAt: new Date(),
    };
    files[fileIndex] = updatedFile;
    await saveAllFiles(files);
    return updatedFile;
  }

  /**
   * ファイルを更新（バージョン管理あり、file-edit用）
   */
  static async updateWithVersion(data: UpdateFileData): Promise<File> {
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
      createdAt: existingFile.updatedAt,
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

  /**
   * ファイル全体を上書き更新
   */
  static async updateFull(file: File): Promise<File> {
    const allFiles = await getAllFilesRaw();
    const fileIndex = allFiles.findIndex(f => f.id === file.id);

    if (fileIndex === -1) {
      throw new StorageError(`File with id ${file.id} not found`, 'NOT_FOUND');
    }

    const updatedFile = {
      ...file,
      updatedAt: new Date(),
    };

    allFiles[fileIndex] = updatedFile;
    await saveAllFiles(allFiles);
    return updatedFile;
  }

  /**
   * 複数ファイルを一括更新
   */
  static async batchUpdate(files: File[]): Promise<void> {
    const allFiles = await getAllFilesRaw();
    const fileMap = new Map(files.map(n => [n.id, n]));

    const updated = allFiles.map(n => {
      const updatedFile = fileMap.get(n.id);
      if (updatedFile) {
        return {
          ...updatedFile,
          updatedAt: new Date(),
        };
      }
      return n;
    });

    await saveAllFiles(updated);
  }

  // --- 削除操作 ---

  /**
   * 単一ファイルを削除
   */
  static async delete(fileId: string): Promise<void> {
    await this.batchDelete([fileId]);
  }

  /**
   * 複数ファイルを一括削除
   */
  static async batchDelete(fileIds: string[]): Promise<void> {
    let files = await getAllFilesRaw();
    files = files.filter(file => !fileIds.includes(file.id));
    await saveAllFiles(files);
  }

  // --- コピー・移動操作 ---

  /**
   * ファイルをコピー
   */
  static async copy(sourceIds: string[]): Promise<File[]> {
    const files = await getAllFilesRaw();
    const copiedFiles: File[] = [];
    const now = new Date();

    for (const id of sourceIds) {
      const fileToCopy = files.find(file => file.id === id);
      if (fileToCopy) {
        // Find a unique title for the copied file
        let newTitle = `Copy of ${fileToCopy.title}`;
        let counter = 1;

        while (
          files.some(n => n.path === fileToCopy.path && n.title === newTitle) ||
          copiedFiles.some(n => n.path === fileToCopy.path && n.title === newTitle)
        ) {
          newTitle = `Copy of ${fileToCopy.title} (${counter})`;
          counter++;
        }

        const newFile: File = {
          ...fileToCopy,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
          title: newTitle,
          version: 1,
        };
        copiedFiles.push(newFile);
      }
    }

    if (copiedFiles.length > 0) {
      await saveAllFiles([...files, ...copiedFiles]);
    }
    return copiedFiles;
  }

  /**
   * ファイルを移動（パス変更）
   */
  static async move(fileId: string, newPath: string): Promise<File> {
    const files = await getAllFilesRaw();
    const fileIndex = files.findIndex(n => n.id === fileId);

    if (fileIndex === -1) {
      throw new StorageError(`File with id ${fileId} not found`, 'NOT_FOUND');
    }

    files[fileIndex].path = newPath;
    files[fileIndex].updatedAt = new Date();
    await saveAllFiles(files);
    return files[fileIndex];
  }

  // --- バージョン管理操作 ---

  /**
   * ファイルのバージョン履歴を取得
   */
  static async getVersions(fileId: string): Promise<FileVersion[]> {
    const allVersions = await getAllVersionsRaw();
    return allVersions.filter(version => version.fileId === fileId);
  }

  /**
   * 特定バージョンを取得
   */
  static async getVersion(versionId: string): Promise<FileVersion | null> {
    const allVersions = await getAllVersionsRaw();
    return allVersions.find(version => version.id === versionId) || null;
  }

  /**
   * ファイルを特定バージョンに復元
   */
  static async restoreVersion(fileId: string, versionId: string): Promise<File> {
    const versionToRestore = await this.getVersion(versionId);
    if (!versionToRestore || versionToRestore.fileId !== fileId) {
      throw new StorageError(
        `Version with id ${versionId} for file ${fileId} not found`,
        'VERSION_NOT_FOUND'
      );
    }

    const file = await this.getById(fileId);
    if (!file) {
      throw new StorageError(`File with id ${fileId} not found`, 'NOT_FOUND');
    }

    // Update the file with the content from the version to restore
    return this.updateWithVersion({
      id: fileId,
      content: versionToRestore.content,
    });
  }

  // --- 内部用メソッド ---

  /**
   * 全ファイルを保存（内部用）
   * @internal
   */
  static async saveAll(files: File[]): Promise<void> {
    await saveAllFiles(files);
  }
}
