/**
 * @file folderRepository.ts
 * @summary 統合フォルダリポジトリ
 * @description
 * フォルダに関するすべてのデータアクセスロジックを一元化。
 */

import { v4 as uuidv4 } from 'uuid';
import { Folder, CreateFolderData, UpdateFolderData } from './type';
import { PathService } from '../services/PathService';
import {
  getAllFoldersRawFS,
  saveAllFoldersFS,
  getAllFilesRawFS,
  saveAllFilesFS,
  StorageError,
} from './storageService';
import { FileRepository } from './fileRepository';

// Re-export StorageError for consumers
export { StorageError };

/**
 * 統合フォルダリポジトリ
 * フォルダのすべてのCRUD操作を提供
 */
export class FolderRepository {
  // --- 基本的な取得操作 ---

  /**
   * 全フォルダを取得
   */
  static async getAll(): Promise<Folder[]> {
    return await getAllFoldersRawFS();
  }

  /**
   * 指定パス内のフォルダを取得
   */
  static async getByPath(path: string): Promise<Folder[]> {
    const folders = await getAllFoldersRawFS();
    return folders.filter(folder => folder.path === path);
  }

  /**
   * IDでフォルダを取得
   */
  static async getById(folderId: string): Promise<Folder | null> {
    const allFolders = await getAllFoldersRawFS();
    return allFolders.find(folder => folder.id === folderId) || null;
  }

  /**
   * 複数のフォルダをIDで取得
   */
  static async getByIds(folderIds: string[]): Promise<Folder[]> {
    const allFolders = await getAllFoldersRawFS();
    return allFolders.filter(folder => folderIds.includes(folder.id));
  }

  // --- 作成・更新操作 ---

  /**
   * フォルダを作成
   */
  static async create(data: CreateFolderData): Promise<Folder> {
    const now = new Date();

    const newFolder: Folder = {
      id: uuidv4(),
      name: data.name,
      path: data.path,
      createdAt: now,
      updatedAt: now,
    };

    const folders = await getAllFoldersRawFS();
    folders.push(newFolder);
    await saveAllFoldersFS(folders);
    return newFolder;
  }

  /**
   * フォルダを更新
   */
  static async update(data: UpdateFolderData): Promise<Folder> {
    const allFolders = await getAllFoldersRawFS();
    const folderIndex = allFolders.findIndex(f => f.id === data.id);

    if (folderIndex === -1) {
      throw new StorageError(`Folder with id ${data.id} not found`, 'NOT_FOUND');
    }

    const folderToUpdate = allFolders[folderIndex];

    if (data.name !== undefined) {
      folderToUpdate.name = data.name;
    }
    if (data.path !== undefined) {
      folderToUpdate.path = data.path;
    }
    folderToUpdate.updatedAt = new Date();

    await saveAllFoldersFS(allFolders);
    return folderToUpdate;
  }

  /**
   * フォルダ全体を上書き更新
   */
  static async updateFull(folder: Folder): Promise<Folder> {
    const allFolders = await getAllFoldersRawFS();
    const folderIndex = allFolders.findIndex(f => f.id === folder.id);

    if (folderIndex === -1) {
      throw new StorageError(`Folder with id ${folder.id} not found`, 'NOT_FOUND');
    }

    const updatedFolder = {
      ...folder,
      updatedAt: new Date(),
    };

    allFolders[folderIndex] = updatedFolder;
    await saveAllFoldersFS(allFolders);
    return updatedFolder;
  }

  /**
   * 複数フォルダを一括更新
   */
  static async batchUpdate(folders: Folder[]): Promise<void> {
    const allFolders = await getAllFoldersRawFS();
    const folderMap = new Map(folders.map(f => [f.id, f]));

    const updated = allFolders.map(f => {
      const updatedFolder = folderMap.get(f.id);
      if (updatedFolder) {
        return {
          ...updatedFolder,
          updatedAt: new Date(),
        };
      }
      return f;
    });

    await saveAllFoldersFS(updated);
  }

  // --- 削除操作 ---

  /**
   * フォルダを削除
   * @param folderId フォルダID
   * @param deleteContents 中身も削除するかどうか
   */
  static async delete(folderId: string, deleteContents: boolean = false): Promise<void> {
    let allFolders = await getAllFoldersRawFS();
    const folderIndex = allFolders.findIndex(f => f.id === folderId);

    if (folderIndex === -1) {
      throw new StorageError(`Folder with id ${folderId} not found`, 'NOT_FOUND');
    }

    const folderToDelete = allFolders[folderIndex];
    const folderPath = PathService.getFullPath(folderToDelete.path, folderToDelete.name, 'folder');

    if (deleteContents) {
      let allFiles = await getAllFilesRawFS();

      // Filter files: keep those that are not in the folder path or any sub-path.
      const finalFiles = allFiles.filter(file => !file.path.startsWith(folderPath));

      // Filter folders: keep those whose full path does not start with the folder path.
      const finalFolders = allFolders.filter(folder => {
        const fullPath = PathService.getFullPath(folder.path, folder.name, 'folder');
        return !fullPath.startsWith(folderPath);
      });

      await saveAllFilesFS(finalFiles);
      await saveAllFoldersFS(finalFolders);
    } else {
      // Folder must be empty
      const filesInFolder = await FileRepository.getByPath(folderPath);
      const foldersInFolder = await this.getByPath(folderPath);
      if (filesInFolder.length > 0 || foldersInFolder.length > 0) {
        throw new StorageError('Folder is not empty', 'FOLDER_NOT_EMPTY');
      }
      // Just delete the folder
      allFolders.splice(folderIndex, 1);
      await saveAllFoldersFS(allFolders);
    }
  }

  /**
   * 複数フォルダを一括削除
   */
  static async batchDelete(folderIds: string[]): Promise<void> {
    const allFolders = await getAllFoldersRawFS();
    const remaining = allFolders.filter(f => !folderIds.includes(f.id));
    await saveAllFoldersFS(remaining);
  }

  // --- 内部用メソッド ---

  /**
   * 全フォルダを保存（内部用）
   * @internal
   */
  static async saveAll(folders: Folder[]): Promise<void> {
    await saveAllFoldersFS(folders);
  }
}
