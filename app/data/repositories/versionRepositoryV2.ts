/**
 * @file versionRepositoryV2.ts
 * @summary V2バージョンリポジトリ - ファイルバージョン管理専用
 * @description
 * ファイルのバージョン履歴管理を担当するリポジトリ。
 * fileRepositoryV2.tsから分離し、単一責任原則に従った設計。
 *
 * 主な機能:
 * - バージョンの保存・取得
 * - バージョン履歴の管理
 * - バージョンの復元
 */

import { v4 as uuidv4 } from 'uuid';
import type { FileVersion } from '../core/types';
import * as FileSystemUtilsV2 from '../infrastructure/fileSystemUtilsV2';
import { FileSystemV2Error, RepositoryError } from '../core/errors';

// Re-export errors for consumers
export { FileSystemV2Error, RepositoryError };

/**
 * V2バージョンリポジトリ
 * ファイルバージョンのすべてのCRUD操作を提供
 */
export class VersionRepositoryV2 {
  // =============================================================================
  // バージョン保存操作
  // =============================================================================

  /**
   * 新しいバージョンを保存
   *
   * @param fileId - ファイルID
   * @param content - バージョンコンテンツ
   * @param version - バージョン番号
   * @returns 作成されたバージョン
   *
   * @example
   * const newVersion = await VersionRepositoryV2.createVersion(
   *   'file-uuid-123',
   *   'Old content',
   *   1
   * );
   */
  static async createVersion(
    fileId: string,
    content: string,
    version: number
  ): Promise<FileVersion> {
    try {
      const versionId = uuidv4();
      const now = new Date();

      const fileVersion: FileVersion = {
        id: versionId,
        fileId,
        content,
        version,
        createdAt: now,
      };

      // バージョンを保存
      await FileSystemUtilsV2.saveVersion(fileId, versionId, content);

      return fileVersion;
    } catch (e) {
      throw new RepositoryError(
        `Failed to create version for file: ${fileId}`,
        'CREATE_VERSION_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // バージョン取得操作
  // =============================================================================

  /**
   * ファイルのバージョン履歴を取得
   *
   * @param fileId - ファイルID
   * @returns バージョンの配列
   *
   * @example
   * const versions = await VersionRepositoryV2.getVersions('file-uuid-123');
   */
  static async getVersions(fileId: string): Promise<FileVersion[]> {
    try {
      // バージョンIDのリストを取得
      const versionIds = await FileSystemUtilsV2.listVersions(fileId);

      // 各バージョンのコンテンツを並行読み込み
      const versions = await Promise.all(
        versionIds.map(async (versionId) => {
          const content = await FileSystemUtilsV2.readVersion(fileId, versionId);

          // バージョンメタデータを構築
          const version: FileVersion = {
            id: versionId,
            fileId,
            content,
            version: 1, // 実際のバージョン番号は取得できない（メタデータなし）
            createdAt: new Date(), // 実際の作成日時は取得できない
          };

          return version;
        })
      );

      return versions;
    } catch (e) {
      throw new RepositoryError(
        `Failed to get versions for file: ${fileId}`,
        'GET_VERSIONS_ERROR',
        e
      );
    }
  }

  /**
   * 特定バージョンを取得
   *
   * @param fileId - ファイルID
   * @param versionId - バージョンID
   * @returns バージョン、存在しない場合はnull
   *
   * @example
   * const version = await VersionRepositoryV2.getVersionById(
   *   'file-uuid-123',
   *   'version-uuid-456'
   * );
   */
  static async getVersionById(
    fileId: string,
    versionId: string
  ): Promise<FileVersion | null> {
    try {
      const content = await FileSystemUtilsV2.readVersion(fileId, versionId);

      const version: FileVersion = {
        id: versionId,
        fileId,
        content,
        version: 1,
        createdAt: new Date(),
      };

      return version;
    } catch (e) {
      if (e instanceof FileSystemV2Error && e.code === 'VERSION_NOT_FOUND') {
        return null;
      }
      throw new RepositoryError(
        `Failed to get version: ${fileId}/${versionId}`,
        'GET_VERSION_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // バージョン復元操作
  // =============================================================================

  /**
   * ファイルを特定バージョンに復元
   *
   * @param fileId - ファイルID
   * @param versionId - バージョンID
   * @param updateFileContentCallback - ファイル更新用コールバック関数
   * @returns 復元成功フラグ
   *
   * @remarks
   * この関数はバージョンコンテンツを取得し、
   * ファイルの更新は呼び出し側（FileRepositoryV2）に委譲します。
   * これにより、循環依存を回避します。
   *
   * @example
   * await VersionRepositoryV2.restoreVersion(
   *   'file-uuid-123',
   *   'version-uuid-456',
   *   async (content) => {
   *     await FileRepositoryV2.update(fileId, { content });
   *   }
   * );
   */
  static async restoreVersion(
    fileId: string,
    versionId: string,
    updateFileContentCallback: (content: string) => Promise<void>
  ): Promise<boolean> {
    try {
      const versionToRestore = await this.getVersionById(fileId, versionId);
      if (!versionToRestore) {
        throw new RepositoryError(
          `Version not found: ${fileId}/${versionId}`,
          'VERSION_NOT_FOUND'
        );
      }

      // コールバックを使用してファイルを更新
      await updateFileContentCallback(versionToRestore.content);

      return true;
    } catch (e) {
      if (e instanceof RepositoryError) {
        throw e;
      }
      throw new RepositoryError(
        `Failed to restore version: ${fileId}/${versionId}`,
        'RESTORE_VERSION_ERROR',
        e
      );
    }
  }

  /**
   * ファイルを特定バージョンのコンテンツのみ取得
   *
   * @param fileId - ファイルID
   * @param versionId - バージョンID
   * @returns バージョンコンテンツ
   *
   * @example
   * const content = await VersionRepositoryV2.getVersionContent(
   *   'file-uuid-123',
   *   'version-uuid-456'
   * );
   */
  static async getVersionContent(fileId: string, versionId: string): Promise<string> {
    try {
      const version = await this.getVersionById(fileId, versionId);
      if (!version) {
        throw new RepositoryError(
          `Version not found: ${fileId}/${versionId}`,
          'VERSION_NOT_FOUND'
        );
      }
      return version.content;
    } catch (e) {
      if (e instanceof RepositoryError) {
        throw e;
      }
      throw new RepositoryError(
        `Failed to get version content: ${fileId}/${versionId}`,
        'GET_VERSION_CONTENT_ERROR',
        e
      );
    }
  }
}
