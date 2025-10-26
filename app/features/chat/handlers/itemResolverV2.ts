/**
 * @file itemResolverV2.ts
 * @summary アイテム検索ユーティリティ（V2構造対応）
 * @responsibility パスからファイルやフォルダを検索する共通ロジックを提供します
 *
 * 主な改善点:
 * - ❌ 全件取得パターンの削除 → DirectoryResolverを活用
 * - ✅ シンプルで効率的な実装
 */

import { FileV2, FolderV2, metadataToFolderV2 } from '@data/typeV2';
import { FileRepositoryV2 } from '@data/fileRepositoryV2';
import { DirectoryResolver } from '@data/directoryResolver';
import * as FileSystemUtilsV2 from '@data/fileSystemUtilsV2';
import { PathServiceV2 } from '../../../services/PathServiceV2';
import { logger } from '../../../utils/logger';

/**
 * 検索結果の型定義
 */
export interface ResolvedItemV2 {
  type: 'file' | 'folder';
  id: string;
  item: FileV2 | FolderV2;
  fullPath: string;
}

/**
 * パスからアイテム（ファイルまたはフォルダ）を検索します
 *
 * V1との違い:
 * - ❌ 全件取得してループ検索 → ✅ DirectoryResolverで直接解決
 * - ✅ 効率的！
 *
 * @param path - 検索対象のフルパス（例: "/folder1/file.txt" または "/folder1/subfolder/"）
 * @returns 見つかったアイテム情報、見つからない場合はnull
 */
export async function findItemByPathV2(
  path: string
): Promise<ResolvedItemV2 | null> {
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
      // フォルダを検索（DirectoryResolverで直接解決！）
      const normalizedPath = PathServiceV2.normalizePath(trimmedPath);
      const folderDir = await DirectoryResolver.resolveFolderDirectory(normalizedPath);

      if (!folderDir) {
        logger.warn('itemResolver', 'Folder not found for path', {
          path: trimmedPath,
        });
        return null;
      }

      // メタデータを読み込み
      const metadata = await FileSystemUtilsV2.readFolderMetadata(folderDir);
      if (!metadata) {
        logger.warn('itemResolver', 'Folder metadata not found', {
          path: trimmedPath,
        });
        return null;
      }

      const folder = metadataToFolderV2(metadata);

      logger.debug('itemResolver', 'Found folder by path', {
        path: trimmedPath,
        folderId: folder.id,
        folderName: folder.name,
      });

      return {
        type: 'folder',
        id: folder.id,
        item: folder,
        fullPath: normalizedPath,
      };
    } else {
      // ファイルを検索
      // パスをパースして親パスとファイル名を取得
      const parts = trimmedPath.split('/').filter(Boolean);
      const fileName = parts[parts.length - 1];
      const parentPathParts = parts.slice(0, -1);
      const parentPath = parentPathParts.length > 0 ? parentPathParts.join('/') : '/';

      // 親フォルダ内のファイルを取得（全件取得不要！）
      const files = await FileRepositoryV2.getByFolderPath(parentPath);

      // タイトルが一致するファイルを検索
      const file = files.find(f => f.title === fileName);

      if (!file) {
        logger.warn('itemResolver', 'File not found for path', {
          path: trimmedPath,
          parentPath,
          fileName,
        });
        return null;
      }

      logger.debug('itemResolver', 'Found file by path', {
        path: trimmedPath,
        fileId: file.id,
        fileTitle: file.title,
      });

      return {
        type: 'file',
        id: file.id,
        item: file,
        fullPath: trimmedPath,
      };
    }
  } catch (error) {
    logger.error('itemResolver', 'Error finding item by path', { path, error });
    return null;
  }
}

/**
 * パスが有効なディレクトリパスかどうかを検証します
 *
 * V1との違い:
 * - ❌ 全件取得してループ検索 → ✅ DirectoryResolverで直接チェック
 * - ✅ 効率的！
 *
 * @param path - 検証対象のパス
 * @returns パスが存在する場合はtrue
 */
export async function isValidDirectoryPathV2(path: string): Promise<boolean> {
  try {
    const normalizedPath = PathServiceV2.normalizePath(path);

    // ルートパスは常に有効
    if (normalizedPath === '/' || normalizedPath === '') {
      return true;
    }

    // DirectoryResolverで直接チェック（全件取得不要！）
    const folderDir = await DirectoryResolver.resolveFolderDirectory(normalizedPath);
    return folderDir !== null;
  } catch (error) {
    logger.error('itemResolver', 'Error validating directory path', {
      path,
      error,
    });
    return false;
  }
}
