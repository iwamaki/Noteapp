/**
 * @file itemResolver.ts
 * @summary アイテム検索ユーティリティ
 * @responsibility パスからノートやフォルダを検索する共通ロジックを提供します
 */

import { File, Folder } from '@shared/types/file';
import { FileListStorage } from '../../../screen/file-list/fileStorage';
import { PathService } from '../../../services/PathService';
import { logger } from '../../../utils/logger';

/**
 * 検索結果の型定義
 */
export interface ResolvedItem {
  type: 'file' | 'folder';
  id: string;
  item: File | Folder;
  fullPath: string;
}

/**
 * パスからアイテム（ノートまたはフォルダ）を検索します
 *
 * @param path - 検索対象のフルパス（例: "/folder1/file.txt" または "/folder1/subfolder/"）
 * @returns 見つかったアイテム情報、見つからない場合はnull
 */
export async function findItemByPath(path: string): Promise<ResolvedItem | null> {
  try {
    // パスの正規化
    const trimmedPath = path.trim();

    // パスが空の場合
    if (!trimmedPath || trimmedPath === '/') {
      logger.warn('itemResolver', 'Cannot resolve root path or empty path');
      return null;
    }

    // パスの末尾でアイテムの種類を判定
    const isFolder = trimmedPath.endsWith('/');

    if (isFolder) {
      // フォルダを検索
      const folders = await FileListStorage.getAllFolders();
      const normalizedPath = PathService.normalizePath(trimmedPath);

      for (const folder of folders) {
        const fullPath = PathService.getFullPath(folder.path, folder.name, 'folder');
        if (fullPath === normalizedPath) {
          logger.debug('itemResolver', 'Found folder by path', {
            path: trimmedPath,
            folderId: folder.id,
            folderName: folder.name,
          });
          return {
            type: 'folder',
            id: folder.id,
            item: folder,
            fullPath,
          };
        }
      }
    } else {
      // ファイルを検索
      const files = await FileListStorage.getAllFiles();

      // パスをパースして親パスとファイル名を取得
      const parts = trimmedPath.split('/').filter(Boolean);
      const fileName = parts[parts.length - 1];
      const parentPath = parts.length > 1 ? `/${parts.slice(0, -1).join('/')}/` : '/';

      for (const file of files) {
        const fullPath = PathService.getFullPath(file.path, file.title, 'file');
        const normalizedNotePath = PathService.normalizePath(file.path);
        const normalizedParentPath = PathService.normalizePath(parentPath);

        // パスとタイトルの両方が一致するかチェック
        if (
          (fullPath === trimmedPath || fullPath === `/${trimmedPath}`) ||
          (normalizedNotePath === normalizedParentPath && file.title === fileName)
        ) {
          logger.debug('itemResolver', 'Found file by path', {
            path: trimmedPath,
            fileId: file.id,
            fileTitle: file.title,
          });
          return {
            type: 'file',
            id: file.id,
            item: file,
            fullPath,
          };
        }
      }
    }

    logger.warn('itemResolver', 'Item not found for path', { path: trimmedPath });
    return null;
  } catch (error) {
    logger.error('itemResolver', 'Error finding item by path', { path, error });
    return null;
  }
}

/**
 * パスが有効なディレクトリパスかどうかを検証します
 *
 * @param path - 検証対象のパス
 * @returns パスが存在する場合はtrue
 */
export async function isValidDirectoryPath(path: string): Promise<boolean> {
  try {
    const normalizedPath = PathService.normalizePath(path);

    // ルートパスは常に有効
    if (normalizedPath === '/') {
      return true;
    }

    // フォルダを検索
    const folders = await FileListStorage.getAllFolders();
    return folders.some(folder => {
      const fullPath = PathService.getFullPath(folder.path, folder.name, 'folder');
      return fullPath === normalizedPath;
    });
  } catch (error) {
    logger.error('itemResolver', 'Error validating directory path', { path, error });
    return false;
  }
}
