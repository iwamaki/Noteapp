/**
 * @file FolderRepository.ts
 * @summary フォルダデータアクセス層
 * @description
 * AsyncStorageへのアクセスを抽象化し、データアクセスの詳細を隠蔽します。
 * ビジネスロジックは含まず、純粋にデータの永続化のみを担当します。
 */

import { Folder, CreateFolderData } from '@shared/types/file';
import { getAllFoldersRaw, saveAllFolders } from '../fileStorage/storage';
import * as FolderFns from '../fileStorage/folder';

/**
 * フォルダリポジトリ
 * データアクセスの単一窓口として機能
 */
export class FolderRepository {
  /**
   * 全フォルダを取得
   * @returns 全フォルダの配列
   */
  static async getAll(): Promise<Folder[]> {
    return await FolderFns.getAllFolders();
  }

  /**
   * 指定パス内のフォルダを取得
   * @param path 親フォルダパス
   * @returns パス内のフォルダの配列
   */
  static async getByPath(path: string): Promise<Folder[]> {
    return await FolderFns.getFoldersByPath(path);
  }

  /**
   * IDでフォルダを取得
   * @param folderId フォルダID
   * @returns フォルダ、見つからない場合はundefined
   */
  static async getById(folderId: string): Promise<Folder | undefined> {
    const allFolders = await getAllFoldersRaw();
    return allFolders.find(folder => folder.id === folderId);
  }

  /**
   * 複数のフォルダをIDで取得
   * @param folderIds フォルダIDの配列
   * @returns 見つかったフォルダの配列
   */
  static async getByIds(folderIds: string[]): Promise<Folder[]> {
    const allFolders = await getAllFoldersRaw();
    return allFolders.filter(folder => folderIds.includes(folder.id));
  }

  /**
   * フォルダを作成
   * @param data フォルダ作成データ
   * @returns 作成されたフォルダ
   */
  static async create(data: CreateFolderData): Promise<Folder> {
    return await FolderFns.createFolder(data);
  }

  /**
   * フォルダを更新
   * @param folder 更新するフォルダ
   * @returns 更新されたフォルダ
   */
  static async update(folder: Folder): Promise<Folder> {
    const allFolders = await getAllFoldersRaw();
    const folderIndex = allFolders.findIndex(f => n.id === folder.id);

    if (folderIndex === -1) {
      throw new Error(`Folder with id ${folder.id} not found`);
    }

    const updatedFolder = {
      ...folder,
      updatedAt: new Date(),
    };

    allFolders[folderIndex] = updatedFolder;
    await saveAllFolders(allFolders);
    return updatedFolder;
  }

  /**
   * 単一フォルダを削除
   * @param folderId フォルダID
   * @param deleteContents 中身も削除するかどうか
   */
  static async delete(folderId: string, deleteContents: boolean = false): Promise<void> {
    await FolderFns.deleteFolder(folderId, deleteContents);
  }

  /**
   * 複数フォルダを一括削除
   * @param folderIds フォルダIDの配列
   * @description
   * 指定されたフォルダのみを削除します（中身は削除しません）。
   * 子フォルダも削除する場合は、事前にすべての子孫フォルダIDを含めてください。
   */
  static async batchDelete(folderIds: string[]): Promise<void> {
    const allFolders = await getAllFoldersRaw();
    const remaining = allFolders.filter(f => !folderIds.includes(f.id));
    await saveAllFolders(remaining);
  }

  /**
   * 複数フォルダを一括更新
   * @param folders 更新するフォルダの配列
   * @description
   * 既存のフォルダをIDでマッチングして更新します。
   * 見つからないIDは無視されます。
   */
  static async batchUpdate(folders: Folder[]): Promise<void> {
    const allFolders = await getAllFoldersRaw();
    const folderMap = new Map(folders.map(f => [f.id, f]));

    // 既存フォルダを更新されたフォルダで置き換え
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

    await saveAllFolders(updated);
  }

  /**
   * 全フォルダを保存（内部用）
   * @param folders 保存するフォルダの配列
   * @description
   * 既存の全データを上書きします。使用には注意が必要です。
   * 通常はbatchUpdate()を使用してください。
   * @internal
   */
  static async saveAll(folders: Folder[]): Promise<void> {
    await saveAllFolders(folders);
  }
}
