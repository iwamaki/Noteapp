/**
 * @file directoryResolver.ts
 * @summary V2ディレクトリ解決ユーティリティ
 * @description
 * 仮想パス（slug-based）からDirectoryオブジェクトを取得するユーティリティ。
 * IDベースの検索機能も提供し、ファイルやフォルダを効率的に探索する。
 *
 * 主な機能:
 * - 仮想パス → Directory変換（O(depth)の効率的な解決）
 * - フォルダID → Directory検索（再帰探索）
 * - ファイルID → Directory検索（再帰探索）
 */

import { Paths, Directory } from 'expo-file-system';
import {
  readFolderMetadata,
  listSubfoldersInFolder,
  listFilesInFolder,
  getContentDirectory,
} from './fileSystemUtilsV2';
import { FileSystemV2Error } from '../core/errors';

// =============================================================================
// Constants
// =============================================================================

const CONTENT_DIR = getContentDirectory();
const ROOT_DIR = new Directory(CONTENT_DIR, 'root');

// =============================================================================
// DirectoryResolver Class
// =============================================================================

/**
 * ディレクトリ解決クラス
 *
 * 仮想パス（スラグベース）からDirectoryオブジェクトへの変換や、
 * IDベースの検索を提供する。
 */
export class DirectoryResolver {
  /**
   * 仮想パスからフォルダディレクトリを解決
   *
   * @param virtualPath - スラグベースの仮想パス（例: "/", "/folder1/subfolder/"）
   * @returns フォルダのDirectory、存在しない場合はnull
   *
   * @example
   * // ルートフォルダ
   * const rootDir = await DirectoryResolver.resolveFolderDirectory('/');
   * const rootDir2 = await DirectoryResolver.resolveFolderDirectory('');
   *
   * // サブフォルダ
   * const subDir = await DirectoryResolver.resolveFolderDirectory('/my-folder/sub-folder/');
   *
   * @remarks
   * - パスはslug（ディレクトリ名）で指定する
   * - フォルダ名ではなくslugを使用することで、O(depth)の効率的な解決が可能
   * - 各階層でディレクトリの存在確認を行う
   */
  static async resolveFolderDirectory(virtualPath: string): Promise<Directory | null> {
    try {
      // ルートパスの処理
      if (virtualPath === '/' || virtualPath === '') {
        return ROOT_DIR;
      }

      // パスをスラグに分解（前後のスラッシュを除去してから分割）
      const slugs = virtualPath.split('/').filter(Boolean);

      // ルートから順にディレクトリを辿る
      let currentDir = ROOT_DIR;

      for (const slug of slugs) {
        const nextDir = new Directory(currentDir, slug);

        // ディレクトリが存在するかチェック
        if (!(await nextDir.exists)) {
          return null;
        }

        // .folder.json が存在するかチェック（本当にフォルダディレクトリか確認）
        const metadata = await readFolderMetadata(nextDir);
        if (!metadata) {
          return null; // メタデータがない = フォルダディレクトリではない
        }

        currentDir = nextDir;
      }

      return currentDir;
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to resolve folder directory: ${virtualPath}`,
        'RESOLVE_FOLDER_ERROR',
        e
      );
    }
  }

  /**
   * フォルダIDからディレクトリを検索（再帰）
   *
   * @param folderId - 検索するフォルダのID
   * @param searchDir - 検索開始ディレクトリ（省略時はルート）
   * @returns フォルダのDirectory、見つからない場合はnull
   *
   * @example
   * const folderDir = await DirectoryResolver.findFolderDirectoryById('folder-uuid-123');
   *
   * @remarks
   * - 再帰的にディレクトリツリーを走査
   * - 深さ優先探索（DFS）で実装
   * - 大規模なフォルダ構造では時間がかかる可能性がある
   */
  static async findFolderDirectoryById(
    folderId: string,
    searchDir?: Directory
  ): Promise<Directory | null> {
    try {
      const startDir = searchDir || ROOT_DIR;

      // 現在のディレクトリのメタデータをチェック
      const metadata = await readFolderMetadata(startDir);
      if (metadata && metadata.id === folderId) {
        return startDir;
      }

      // サブフォルダを取得
      const subfolders = await listSubfoldersInFolder(startDir);

      // 各サブフォルダを再帰的に検索
      for (const subfolder of subfolders) {
        const subfolderDir = new Directory(startDir, subfolder.slug);
        const found = await this.findFolderDirectoryById(folderId, subfolderDir);

        if (found) {
          return found;
        }
      }

      // 見つからなかった
      return null;
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to find folder directory by ID: ${folderId}`,
        'FIND_FOLDER_BY_ID_ERROR',
        e
      );
    }
  }

  /**
   * ファイルIDからファイルディレクトリを検索（再帰）
   *
   * @param fileId - 検索するファイルのID
   * @param searchDir - 検索開始ディレクトリ（省略時はルート）
   * @returns ファイルのDirectory、見つからない場合はnull
   *
   * @example
   * const fileDir = await DirectoryResolver.findFileDirectoryById('file-uuid-456');
   *
   * @remarks
   * - 再帰的にディレクトリツリーを走査
   * - 深さ優先探索（DFS）で実装
   * - 各フォルダ内のファイルをチェックしてから、サブフォルダへ
   */
  static async findFileDirectoryById(
    fileId: string,
    searchDir?: Directory
  ): Promise<Directory | null> {
    try {
      const startDir = searchDir || ROOT_DIR;

      // 現在のフォルダ内のファイルをチェック
      const files = await listFilesInFolder(startDir);

      for (const file of files) {
        if (file.id === fileId) {
          // ファイルディレクトリを返す
          return new Directory(startDir, fileId);
        }
      }

      // サブフォルダを取得
      const subfolders = await listSubfoldersInFolder(startDir);

      // 各サブフォルダを再帰的に検索
      for (const subfolder of subfolders) {
        const subfolderDir = new Directory(startDir, subfolder.slug);
        const found = await this.findFileDirectoryById(fileId, subfolderDir);

        if (found) {
          return found;
        }
      }

      // 見つからなかった
      return null;
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to find file directory by ID: ${fileId}`,
        'FIND_FILE_BY_ID_ERROR',
        e
      );
    }
  }

  /**
   * ファイルIDから親フォルダディレクトリを取得
   *
   * @param fileId - ファイルID
   * @param searchDir - 検索開始ディレクトリ（省略時はルート）
   * @returns 親フォルダのDirectory、見つからない場合はnull
   *
   * @example
   * const parentDir = await DirectoryResolver.getParentFolderOfFile('file-uuid-456');
   */
  static async getParentFolderOfFile(
    fileId: string,
    searchDir?: Directory
  ): Promise<Directory | null> {
    try {
      const fileDir = await this.findFileDirectoryById(fileId, searchDir);
      if (!fileDir) {
        return null;
      }

      // ファイルディレクトリの親 = ファイルが所属するフォルダ
      // fileDir.uri から親ディレクトリを取得
      const parentUri = fileDir.uri.split('/').slice(0, -1).join('/');
      const parentDir = new Directory(Paths.document, parentUri.replace(Paths.document + '/', ''));

      return parentDir;
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to get parent folder of file: ${fileId}`,
        'GET_PARENT_FOLDER_ERROR',
        e
      );
    }
  }

  /**
   * ルートディレクトリを取得
   *
   * @returns ルートフォルダのDirectory
   */
  static getRootDirectory(): Directory {
    return ROOT_DIR;
  }

  /**
   * 仮想パスを正規化
   *
   * @param path - 正規化するパス
   * @returns 正規化されたパス（先頭・末尾のスラッシュを除去）
   *
   * @example
   * normalizePath('/folder1/') // => 'folder1'
   * normalizePath('folder1') // => 'folder1'
   * normalizePath('/') // => ''
   */
  static normalizePath(path: string): string {
    if (!path || path === '/') {
      return '';
    }
    return path.replace(/^\/+|\/+$/g, '');
  }

  /**
   * 仮想パスからslugの配列を取得
   *
   * @param virtualPath - 仮想パス
   * @returns slugの配列
   *
   * @example
   * parseVirtualPath('/folder1/subfolder/') // => ['folder1', 'subfolder']
   * parseVirtualPath('/') // => []
   */
  static parseVirtualPath(virtualPath: string): string[] {
    const normalized = this.normalizePath(virtualPath);
    if (!normalized) {
      return [];
    }
    return normalized.split('/').filter(Boolean);
  }
}
