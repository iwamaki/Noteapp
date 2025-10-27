/**
 * @file folderRepositoryV2.ts
 * @summary V2フォルダリポジトリ - 階層的ディレクトリ構造対応
 * @description
 * expo-file-systemの自然な階層構造を活用した効率的なフォルダ操作。
 * pathフィールドを削除し、slugベースのディレクトリ管理。
 *
 * 主な変更点:
 * - ❌ getAll() - 全件取得パターンを削除
 * - ✅ getByParentPath() - 親パス指定で効率的に取得
 * - ✅ rename() - slugも再生成してディレクトリリネーム
 * - ✅ delete() - ディレクトリ削除で子孫も自動削除（簡単！）
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Folder,
  CreateFolderData,
  UpdateFolderData,
} from '../core/types';
import {
  folderToMetadata,
  metadataToFolder,
} from '../core/converters';
import { generateSlug } from '../core/slugUtils';
import * as FileSystemUtilsV2 from '../infrastructure/fileSystemUtilsV2';
import { DirectoryResolver } from '../infrastructure/directoryResolver';
import { FileSystemV2Error, RepositoryError } from '../core/errors';
import { Directory } from 'expo-file-system';

// Re-export errors for consumers
export { FileSystemV2Error, RepositoryError };

/**
 * V2フォルダリポジトリ
 * フォルダのすべてのCRUD操作を提供
 */
export class FolderRepositoryV2 {
  // =============================================================================
  // 基本的な取得操作
  // =============================================================================

  /**
   * IDでフォルダを取得
   *
   * @param id - フォルダID
   * @returns フォルダ、存在しない場合はnull
   *
   * @example
   * const folder = await FolderRepositoryV2.getById('folder-uuid-123');
   */
  static async getById(id: string): Promise<Folder | null> {
    try {
      // ルートフォルダの特別処理
      if (id === 'root') {
        const rootDir = DirectoryResolver.getRootDirectory();
        const metadata = await FileSystemUtilsV2.readFolderMetadata(rootDir);
        if (metadata) {
          return metadataToFolder(metadata);
        }
        return null;
      }

      // DirectoryResolverでフォルダディレクトリを検索
      const folderDir = await DirectoryResolver.findFolderDirectoryById(id);
      if (!folderDir) {
        return null;
      }

      // メタデータを読み込み
      const metadata = await FileSystemUtilsV2.readFolderMetadata(folderDir);
      if (!metadata) {
        return null;
      }

      return metadataToFolder(metadata);
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to get folder by ID: ${id}`,
        'GET_FOLDER_BY_ID_ERROR',
        e
      );
    }
  }

  /**
   * 親フォルダ内のサブフォルダを取得
   *
   * @param parentPath - 親フォルダパス（例: "/", "/my-folder/"）
   * @returns サブフォルダの配列
   *
   * @example
   * // ルート直下のフォルダを取得
   * const folders = await FolderRepositoryV2.getByParentPath('/');
   *
   * // サブフォルダ内のフォルダを取得
   * const subfolders = await FolderRepositoryV2.getByParentPath('/my-folder/');
   */
  static async getByParentPath(parentPath: string): Promise<Folder[]> {
    try {
      // 親フォルダディレクトリを解決
      const parentDir = await DirectoryResolver.resolveFolderDirectory(parentPath);
      if (!parentDir) {
        return [];
      }

      // サブフォルダメタデータを取得
      const metadataList = await FileSystemUtilsV2.listSubfoldersInFolder(parentDir);

      // メタデータをFolderに変換
      return metadataList.map(metadataToFolder);
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to get folders by parent path: ${parentPath}`,
        'GET_FOLDERS_BY_PARENT_PATH_ERROR',
        e
      );
    }
  }

  /**
   * 複数のフォルダをIDで取得
   *
   * @param folderIds - フォルダIDの配列
   * @returns フォルダの配列
   */
  static async getByIds(folderIds: string[]): Promise<Folder[]> {
    try {
      // 並行検索
      const results = await Promise.all(
        folderIds.map(async (id) => {
          return await this.getById(id);
        })
      );

      // nullを除外
      return results.filter((folder): folder is Folder => folder !== null);
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to get folders by IDs`,
        'GET_FOLDERS_BY_IDS_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // 作成・更新操作
  // =============================================================================

  /**
   * フォルダを作成
   *
   * @param data - フォルダ作成データ
   * @param parentPath - 親フォルダパス（例: "/", "/my-folder/"）
   * @returns 作成されたフォルダ
   *
   * @example
   * const folder = await FolderRepositoryV2.create(
   *   { name: 'New Folder' },
   *   '/'
   * );
   */
  static async create(data: CreateFolderData, parentPath: string): Promise<Folder> {
    try {
      // 親フォルダディレクトリを解決
      const parentDir = await DirectoryResolver.resolveFolderDirectory(parentPath);
      if (!parentDir) {
        throw new FileSystemV2Error(
          `Parent folder not found: ${parentPath}`,
          'PARENT_FOLDER_NOT_FOUND'
        );
      }

      // slugを生成
      let slug = generateSlug(data.name);

      // 空のslugになる場合は、UUIDベースのslugを使用
      if (!slug) {
        const tempId = uuidv4().substring(0, 8);
        slug = `folder-${tempId}`;
      }

      // slug重複チェック
      let finalSlug = slug;
      let counter = 1;
      while (true) {
        const testDir = new Directory(parentDir, finalSlug);
        if (!(await testDir.exists)) {
          break; // 重複なし
        }
        finalSlug = `${slug}-${counter}`;
        counter++;
      }

      const now = new Date();
      const folderId = uuidv4();

      const newFolder: Folder = {
        id: folderId,
        name: data.name,
        slug: finalSlug,
        createdAt: now,
        updatedAt: now,
      };

      const metadata = folderToMetadata(newFolder);

      // フォルダディレクトリを作成
      await FileSystemUtilsV2.createFolderDirectory(parentDir, finalSlug, metadata);

      return newFolder;
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to create folder: ${data.name}`,
        'CREATE_FOLDER_ERROR',
        e
      );
    }
  }

  /**
   * フォルダをリネーム
   *
   * @param id - フォルダID
   * @param newName - 新しいフォルダ名
   * @returns 更新されたフォルダ
   *
   * @remarks
   * リネームすると、slugも再生成されディレクトリ名も変更されます。
   * 中身（サブフォルダ・ファイル）は自動的に移動されます。
   */
  static async rename(id: string, newName: string): Promise<Folder> {
    try {
      // ルートフォルダはリネーム不可
      if (id === 'root') {
        throw new FileSystemV2Error(
          'Cannot rename root folder',
          'CANNOT_RENAME_ROOT'
        );
      }

      // フォルダディレクトリを検索
      const folderDir = await DirectoryResolver.findFolderDirectoryById(id);
      if (!folderDir) {
        throw new FileSystemV2Error(`Folder not found: ${id}`, 'FOLDER_NOT_FOUND');
      }

      // 既存のメタデータを読み込み
      const existingMetadata = await FileSystemUtilsV2.readFolderMetadata(folderDir);
      if (!existingMetadata) {
        throw new FileSystemV2Error(
          `Folder metadata not found: ${id}`,
          'FOLDER_METADATA_NOT_FOUND'
        );
      }

      const existingFolder = metadataToFolder(existingMetadata);

      // 新しいslugを生成
      let newSlug = generateSlug(newName);

      // 空のslugになる場合は、既存のslugを維持
      if (!newSlug) {
        newSlug = existingFolder.slug;
      }

      // 親ディレクトリを取得（folderDir.uriから推測）
      const parentUri = folderDir.uri.split('/').slice(0, -1).join('/');
      const parentDir = new Directory(parentUri, '');

      // slug重複チェック（同じ親内で）
      let finalSlug = newSlug;
      let counter = 1;
      while (true) {
        const testDir = new Directory(parentDir, finalSlug);

        // 既存のディレクトリと同じなら重複チェックスキップ
        if (testDir.uri === folderDir.uri) {
          break;
        }

        if (!(await testDir.exists)) {
          break; // 重複なし
        }
        finalSlug = `${newSlug}-${counter}`;
        counter++;
      }

      // 更新されたフォルダ
      const updatedFolder: Folder = {
        ...existingFolder,
        name: newName,
        slug: finalSlug,
        updatedAt: new Date(),
      };

      const updatedMetadata = folderToMetadata(updatedFolder);

      // slugが変わる場合は、ディレクトリを移動
      if (finalSlug !== existingFolder.slug) {
        const newFolderDir = new Directory(parentDir, finalSlug);

        // 新しいディレクトリを作成してメタデータを書き込み
        await FileSystemUtilsV2.createFolderDirectory(parentDir, finalSlug, updatedMetadata);

        // 中身（サブフォルダ・ファイル）を移動
        const items = await folderDir.list();
        for (const item of items) {
          const itemName = item.uri.split('/').pop() || '';

          if (item instanceof Directory) {
            // サブディレクトリを移動
            const targetSubDir = new Directory(newFolderDir, itemName);

            // ディレクトリごとコピー（再帰的にコピー）
            await FileSystemUtilsV2.copyDirectoryRecursive(item, targetSubDir);
          }
          // Fileの場合はcopyDirectoryRecursive内で処理されるのでスキップ
        }

        // 旧ディレクトリを削除
        await FileSystemUtilsV2.deleteFolderDirectory(folderDir);
      } else {
        // slugが同じ場合は、メタデータのみ更新
        await FileSystemUtilsV2.writeFolderMetadata(folderDir, updatedMetadata);
      }

      return updatedFolder;
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to rename folder: ${id} to ${newName}`,
        'RENAME_FOLDER_ERROR',
        e
      );
    }
  }

  /**
   * フォルダを更新
   *
   * @param id - フォルダID
   * @param data - 更新データ
   * @returns 更新されたフォルダ
   */
  static async update(id: string, data: UpdateFolderData): Promise<Folder> {
    try {
      // 名前の更新がある場合はrenameを使用
      if (data.name !== undefined) {
        return await this.rename(id, data.name);
      }

      // それ以外の更新は現状なし（nameのみ更新可能）
      const folder = await this.getById(id);
      if (!folder) {
        throw new FileSystemV2Error(`Folder not found: ${id}`, 'FOLDER_NOT_FOUND');
      }

      return folder;
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to update folder: ${id}`,
        'UPDATE_FOLDER_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // 削除操作
  // =============================================================================

  /**
   * フォルダを削除（中身ごと）
   *
   * @param id - フォルダID
   *
   * @remarks
   * ディレクトリ削除により、サブフォルダ・ファイルも自動的に削除されます。
   * expo-file-systemのネイティブ機能を活用した簡潔な実装です。
   */
  static async delete(id: string): Promise<void> {
    try {
      // ルートフォルダは削除不可
      if (id === 'root') {
        throw new FileSystemV2Error(
          'Cannot delete root folder',
          'CANNOT_DELETE_ROOT'
        );
      }

      // フォルダディレクトリを検索
      const folderDir = await DirectoryResolver.findFolderDirectoryById(id);
      if (!folderDir) {
        // 既に存在しない場合は成功とみなす
        return;
      }

      // ディレクトリを削除（中身も含めて削除）
      await FileSystemUtilsV2.deleteFolderDirectory(folderDir);
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to delete folder: ${id}`,
        'DELETE_FOLDER_ERROR',
        e
      );
    }
  }

  /**
   * 複数フォルダを一括削除
   *
   * @param folderIds - フォルダIDの配列
   */
  static async batchDelete(folderIds: string[]): Promise<void> {
    try {
      // 並行削除
      await Promise.all(folderIds.map((id) => this.delete(id)));
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to batch delete folders`,
        'BATCH_DELETE_FOLDERS_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // 移動操作
  // =============================================================================

  /**
   * フォルダを移動
   *
   * @param id - フォルダID
   * @param targetParentPath - 移動先の親フォルダパス
   */
  static async move(id: string, targetParentPath: string): Promise<void> {
    try {
      // ルートフォルダは移動不可
      if (id === 'root') {
        throw new FileSystemV2Error(
          'Cannot move root folder',
          'CANNOT_MOVE_ROOT'
        );
      }

      // ソースフォルダディレクトリを検索
      const sourceFolderDir = await DirectoryResolver.findFolderDirectoryById(id);
      if (!sourceFolderDir) {
        throw new FileSystemV2Error(
          `Source folder not found: ${id}`,
          'SOURCE_FOLDER_NOT_FOUND'
        );
      }

      // ソースフォルダのメタデータを読み込み
      const metadata = await FileSystemUtilsV2.readFolderMetadata(sourceFolderDir);
      if (!metadata) {
        throw new FileSystemV2Error(
          `Source folder metadata not found: ${id}`,
          'SOURCE_FOLDER_METADATA_NOT_FOUND'
        );
      }

      // ターゲット親フォルダを解決
      const targetParentDir = await DirectoryResolver.resolveFolderDirectory(targetParentPath);
      if (!targetParentDir) {
        throw new FileSystemV2Error(
          `Target parent folder not found: ${targetParentPath}`,
          'TARGET_PARENT_FOLDER_NOT_FOUND'
        );
      }

      // ターゲット親フォルダに新しいフォルダディレクトリを作成
      const targetFolderDir = new Directory(targetParentDir, metadata.slug);

      // ディレクトリごとコピー
      await FileSystemUtilsV2.copyDirectoryRecursive(sourceFolderDir, targetFolderDir);

      // ソースフォルダディレクトリを削除
      await FileSystemUtilsV2.deleteFolderDirectory(sourceFolderDir);
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to move folder: ${id} to ${targetParentPath}`,
        'MOVE_FOLDER_ERROR',
        e
      );
    }
  }

}
