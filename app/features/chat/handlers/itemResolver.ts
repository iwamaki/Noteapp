/**
 * @file itemResolver.ts
 * @summary アイテム検索ユーティリティ
 * @responsibility パスからノートやフォルダを検索する共通ロジックを提供します
 */

import { Note, Folder } from '@shared/types/note';
import { NoteListStorage } from '../../../screen/note-list/noteStorage';
import { PathUtils } from '../../../screen/note-list/utils/pathUtils';
import { logger } from '../../../utils/logger';

/**
 * 検索結果の型定義
 */
export interface ResolvedItem {
  type: 'note' | 'folder';
  id: string;
  item: Note | Folder;
  fullPath: string;
}

/**
 * パスからアイテム（ノートまたはフォルダ）を検索します
 *
 * @param path - 検索対象のフルパス（例: "/folder1/note.txt" または "/folder1/subfolder/"）
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
      const folders = await NoteListStorage.getAllFolders();
      const normalizedPath = PathUtils.normalizePath(trimmedPath);

      for (const folder of folders) {
        const fullPath = PathUtils.getFullPath(folder.path, folder.name, 'folder');
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
      // ノートを検索
      const notes = await NoteListStorage.getAllNotes();

      // パスをパースして親パスとファイル名を取得
      const parts = trimmedPath.split('/').filter(Boolean);
      const fileName = parts[parts.length - 1];
      const parentPath = parts.length > 1 ? `/${parts.slice(0, -1).join('/')}/` : '/';

      for (const note of notes) {
        const fullPath = PathUtils.getFullPath(note.path, note.title, 'note');
        const normalizedNotePath = PathUtils.normalizePath(note.path);
        const normalizedParentPath = PathUtils.normalizePath(parentPath);

        // パスとタイトルの両方が一致するかチェック
        if (
          (fullPath === trimmedPath || fullPath === `/${trimmedPath}`) ||
          (normalizedNotePath === normalizedParentPath && note.title === fileName)
        ) {
          logger.debug('itemResolver', 'Found note by path', {
            path: trimmedPath,
            noteId: note.id,
            noteTitle: note.title,
          });
          return {
            type: 'note',
            id: note.id,
            item: note,
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
    const normalizedPath = PathUtils.normalizePath(path);

    // ルートパスは常に有効
    if (normalizedPath === '/') {
      return true;
    }

    // フォルダを検索
    const folders = await NoteListStorage.getAllFolders();
    return folders.some(folder => {
      const fullPath = PathUtils.getFullPath(folder.path, folder.name, 'folder');
      return fullPath === normalizedPath;
    });
  } catch (error) {
    logger.error('itemResolver', 'Error validating directory path', { path, error });
    return false;
  }
}
