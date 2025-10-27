/**
 * @file fileRepositoryV2.ts
 * @summary V2ファイルリポジトリ - 階層的ディレクトリ構造対応
 * @description
 * expo-file-systemの自然な階層構造を活用した効率的なファイル操作。
 * pathフィールドを削除し、DirectoryResolver/FileSystemUtilsV2を活用。
 *
 * 主な変更点:
 * - ❌ getAll() - 全件取得パターンを削除
 * - ✅ getByFolderPath() - フォルダパス指定で効率的に取得
 * - ✅ DirectoryResolver活用 - O(1)のID検索（キャッシュなし時はO(depth)）
 * - ✅ パスフィールド不要 - ディレクトリ構造が表現
 */

import { v4 as uuidv4 } from 'uuid';
import {
  File,
  FileVersion,
  CreateFileData,
  UpdateFileData,
  fileToMetadata,
  metadataToFile,
} from './types';
import * as FileSystemUtilsV2 from './fileSystemUtilsV2';
import { DirectoryResolver } from './directoryResolver';
import { FileSystemV2Error } from './fileSystemUtilsV2';
import { Directory } from 'expo-file-system';

// Re-export FileSystemV2Error for consumers
export { FileSystemV2Error };

/**
 * V2ファイルリポジトリ
 * ファイルとファイルバージョンのすべてのCRUD操作を提供
 */
export class FileRepositoryV2 {
  // =============================================================================
  // 基本的な取得操作
  // =============================================================================

  /**
   * IDでファイルを取得
   *
   * @param id - ファイルID
   * @returns ファイル、存在しない場合はnull
   *
   * @example
   * const file = await FileRepositoryV2.getById('file-uuid-123');
   */
  static async getById(id: string): Promise<File | null> {
    try {
      // DirectoryResolverでファイルディレクトリを検索
      const fileDir = await DirectoryResolver.findFileDirectoryById(id);
      if (!fileDir) {
        return null;
      }

      // メタデータとコンテンツを読み込み
      const metadata = await FileSystemUtilsV2.readFileMetadata(fileDir);
      if (!metadata) {
        return null;
      }

      const content = await FileSystemUtilsV2.readFileContent(fileDir);
      return metadataToFile(metadata, content);
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to get file by ID: ${id}`,
        'GET_FILE_BY_ID_ERROR',
        e
      );
    }
  }

  /**
   * フォルダ内のファイルを取得（パスベース、効率的）
   *
   * @param folderPath - フォルダパス（例: "/", "/my-folder/"）
   * @returns ファイルの配列（更新日時降順）
   *
   * @example
   * // ルートフォルダのファイルを取得
   * const files = await FileRepositoryV2.getByFolderPath('/');
   *
   * // サブフォルダのファイルを取得
   * const files = await FileRepositoryV2.getByFolderPath('/my-folder/');
   */
  static async getByFolderPath(folderPath: string): Promise<File[]> {
    try {
      // フォルダディレクトリを解決
      const folderDir = await DirectoryResolver.resolveFolderDirectory(folderPath);
      if (!folderDir) {
        return [];
      }

      // フォルダ内のファイルメタデータを取得
      const metadataList = await FileSystemUtilsV2.listFilesInFolder(folderDir);

      // 各ファイルのコンテンツを並行読み込み
      const files = await Promise.all(
        metadataList.map(async (metadata) => {
          const fileDir = new Directory(folderDir, metadata.id);
          const content = await FileSystemUtilsV2.readFileContent(fileDir);
          return metadataToFile(metadata, content);
        })
      );

      // 更新日時降順でソート
      return files.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to get files by folder path: ${folderPath}`,
        'GET_FILES_BY_PATH_ERROR',
        e
      );
    }
  }

  /**
   * 複数のファイルをIDで取得
   *
   * @param fileIds - ファイルIDの配列
   * @returns ファイルの配列
   */
  static async getByIds(fileIds: string[]): Promise<File[]> {
    try {
      // 並行検索
      const results = await Promise.all(
        fileIds.map(async (id) => {
          return await this.getById(id);
        })
      );

      // nullを除外
      return results.filter((file): file is File => file !== null);
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to get files by IDs`,
        'GET_FILES_BY_IDS_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // 作成・更新操作
  // =============================================================================

  /**
   * ファイルを作成（バージョン管理なし）
   *
   * @param data - ファイル作成データ
   * @param folderPath - 作成先フォルダパス（例: "/", "/my-folder/"）
   * @returns 作成されたファイル
   *
   * @example
   * const file = await FileRepositoryV2.create(
   *   { title: 'New File', content: 'Hello', tags: ['test'] },
   *   '/'
   * );
   */
  static async create(data: CreateFileData, folderPath: string): Promise<File> {
    try {
      // フォルダディレクトリを解決
      const folderDir = await DirectoryResolver.resolveFolderDirectory(folderPath);
      if (!folderDir) {
        throw new FileSystemV2Error(
          `Folder not found: ${folderPath}`,
          'FOLDER_NOT_FOUND'
        );
      }

      const now = new Date();
      const fileId = uuidv4();

      const newFile: File = {
        id: fileId,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        version: 1,
        createdAt: now,
        updatedAt: now,
      };

      const metadata = fileToMetadata(newFile);

      // ファイルディレクトリを作成
      await FileSystemUtilsV2.createFileDirectory(
        folderDir,
        fileId,
        metadata,
        data.content
      );

      return newFile;
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to create file: ${data.title}`,
        'CREATE_FILE_ERROR',
        e
      );
    }
  }

  /**
   * ファイルを作成（バージョン管理あり）
   *
   * @param data - ファイル作成データ
   * @param folderPath - 作成先フォルダパス
   * @returns 作成されたファイル
   */
  static async createWithVersion(
    data: CreateFileData,
    folderPath: string
  ): Promise<File> {
    try {
      // ファイルを作成
      const newFile = await this.create(data, folderPath);

      // 初期バージョンを作成
      const initialVersion: FileVersion = {
        id: uuidv4(),
        fileId: newFile.id,
        content: newFile.content,
        version: newFile.version,
        createdAt: newFile.createdAt,
      };

      await FileSystemUtilsV2.saveVersion(
        newFile.id,
        initialVersion.id,
        initialVersion.content
      );

      return newFile;
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to create file with version: ${data.title}`,
        'CREATE_FILE_WITH_VERSION_ERROR',
        e
      );
    }
  }

  /**
   * ファイルを更新（シンプル版）
   *
   * @param id - ファイルID
   * @param data - 更新データ
   * @returns 更新されたファイル
   */
  static async update(id: string, data: UpdateFileData): Promise<File> {
    try {
      // ファイルディレクトリを検索
      const fileDir = await DirectoryResolver.findFileDirectoryById(id);
      if (!fileDir) {
        throw new FileSystemV2Error(`File not found: ${id}`, 'FILE_NOT_FOUND');
      }

      // 既存のメタデータとコンテンツを読み込み
      const existingMetadata = await FileSystemUtilsV2.readFileMetadata(fileDir);
      if (!existingMetadata) {
        throw new FileSystemV2Error(
          `File metadata not found: ${id}`,
          'FILE_METADATA_NOT_FOUND'
        );
      }

      const existingContent = await FileSystemUtilsV2.readFileContent(fileDir);
      const existingFile = metadataToFile(existingMetadata, existingContent);

      // 更新されたファイルを構築
      const updatedFile: File = {
        ...existingFile,
        title: data.title !== undefined ? data.title : existingFile.title,
        content: data.content !== undefined ? data.content : existingFile.content,
        tags: data.tags !== undefined ? data.tags : existingFile.tags,
        updatedAt: new Date(),
      };

      // メタデータとコンテンツを保存
      const updatedMetadata = fileToMetadata(updatedFile);
      await FileSystemUtilsV2.writeFileMetadata(fileDir, updatedMetadata);

      if (data.content !== undefined) {
        await FileSystemUtilsV2.writeFileContent(fileDir, data.content);
      }

      return updatedFile;
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to update file: ${id}`,
        'UPDATE_FILE_ERROR',
        e
      );
    }
  }

  /**
   * ファイルを更新（バージョン管理あり）
   *
   * @param id - ファイルID
   * @param data - 更新データ
   * @returns 更新されたファイル
   */
  static async updateWithVersion(id: string, data: UpdateFileData): Promise<File> {
    try {
      // 既存ファイルを取得
      const existingFile = await this.getById(id);
      if (!existingFile) {
        throw new FileSystemV2Error(`File not found: ${id}`, 'FILE_NOT_FOUND');
      }

      // 現在の状態を新しいバージョンとして保存
      const newVersionForOldState: FileVersion = {
        id: uuidv4(),
        fileId: existingFile.id,
        content: existingFile.content,
        version: existingFile.version,
        createdAt: existingFile.updatedAt,
      };

      await FileSystemUtilsV2.saveVersion(
        existingFile.id,
        newVersionForOldState.id,
        newVersionForOldState.content
      );

      // ファイルディレクトリを検索
      const fileDir = await DirectoryResolver.findFileDirectoryById(id);
      if (!fileDir) {
        throw new FileSystemV2Error(`File directory not found: ${id}`, 'FILE_DIR_NOT_FOUND');
      }

      // 更新されたファイルを構築（バージョン番号をインクリメント）
      const updatedFile: File = {
        ...existingFile,
        title: data.title !== undefined ? data.title : existingFile.title,
        content: data.content !== undefined ? data.content : existingFile.content,
        tags: data.tags !== undefined ? data.tags : existingFile.tags,
        version: existingFile.version + 1,
        updatedAt: new Date(),
      };

      // メタデータとコンテンツを保存
      const updatedMetadata = fileToMetadata(updatedFile);
      await FileSystemUtilsV2.writeFileMetadata(fileDir, updatedMetadata);

      if (data.content !== undefined) {
        await FileSystemUtilsV2.writeFileContent(fileDir, data.content);
      }

      return updatedFile;
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to update file with version: ${id}`,
        'UPDATE_FILE_WITH_VERSION_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // 削除操作
  // =============================================================================

  /**
   * 単一ファイルを削除
   *
   * @param fileId - ファイルID
   */
  static async delete(fileId: string): Promise<void> {
    try {
      // ファイルディレクトリを検索
      const fileDir = await DirectoryResolver.findFileDirectoryById(fileId);
      if (!fileDir) {
        // 既に存在しない場合は成功とみなす
        return;
      }

      // ファイルディレクトリを削除（meta.json, content.mdごと削除）
      await FileSystemUtilsV2.deleteFileDirectory(fileDir);
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to delete file: ${fileId}`,
        'DELETE_FILE_ERROR',
        e
      );
    }
  }

  /**
   * 複数ファイルを一括削除
   *
   * @param fileIds - ファイルIDの配列
   */
  static async batchDelete(fileIds: string[]): Promise<void> {
    try {
      // 並行削除
      await Promise.all(fileIds.map((id) => this.delete(id)));
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to batch delete files`,
        'BATCH_DELETE_FILES_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // コピー・移動操作
  // =============================================================================

  /**
   * ファイルをコピー
   *
   * @param sourceIds - コピー元ファイルIDの配列
   * @param targetFolderPath - コピー先フォルダパス
   * @returns コピーされたファイルの配列
   */
  static async copy(sourceIds: string[], targetFolderPath: string): Promise<File[]> {
    try {
      const copiedFiles: File[] = [];
      const now = new Date();

      // ターゲットフォルダを解決
      const targetFolderDir = await DirectoryResolver.resolveFolderDirectory(targetFolderPath);
      if (!targetFolderDir) {
        throw new FileSystemV2Error(
          `Target folder not found: ${targetFolderPath}`,
          'TARGET_FOLDER_NOT_FOUND'
        );
      }

      // ターゲットフォルダ内の既存ファイルを取得（重複チェック用）
      const existingFiles = await this.getByFolderPath(targetFolderPath);
      const existingTitles = new Set(existingFiles.map((f) => f.title));

      for (const id of sourceIds) {
        const fileToCopy = await this.getById(id);
        if (!fileToCopy) {
          continue;
        }

        // 重複しないタイトルを生成
        let newTitle = `Copy of ${fileToCopy.title}`;
        let counter = 1;

        while (existingTitles.has(newTitle) || copiedFiles.some((f) => f.title === newTitle)) {
          newTitle = `Copy of ${fileToCopy.title} (${counter})`;
          counter++;
        }

        const newFile: File = {
          ...fileToCopy,
          id: uuidv4(),
          title: newTitle,
          version: 1,
          createdAt: now,
          updatedAt: now,
        };

        // ファイルを作成
        const metadata = fileToMetadata(newFile);
        await FileSystemUtilsV2.createFileDirectory(
          targetFolderDir,
          newFile.id,
          metadata,
          newFile.content
        );

        copiedFiles.push(newFile);
        existingTitles.add(newTitle);
      }

      return copiedFiles;
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to copy files`,
        'COPY_FILES_ERROR',
        e
      );
    }
  }

  /**
   * ファイルを移動（フォルダ間）
   *
   * @param fileId - ファイルID
   * @param targetFolderPath - 移動先フォルダパス
   */
  static async move(fileId: string, targetFolderPath: string): Promise<void> {
    try {
      // ソースファイルを取得
      const sourceFile = await this.getById(fileId);
      if (!sourceFile) {
        throw new FileSystemV2Error(`File not found: ${fileId}`, 'FILE_NOT_FOUND');
      }

      // ソースファイルディレクトリを検索
      const sourceFileDir = await DirectoryResolver.findFileDirectoryById(fileId);
      if (!sourceFileDir) {
        throw new FileSystemV2Error(
          `Source file directory not found: ${fileId}`,
          'SOURCE_FILE_DIR_NOT_FOUND'
        );
      }

      // ターゲットフォルダを解決
      const targetFolderDir = await DirectoryResolver.resolveFolderDirectory(targetFolderPath);
      if (!targetFolderDir) {
        throw new FileSystemV2Error(
          `Target folder not found: ${targetFolderPath}`,
          'TARGET_FOLDER_NOT_FOUND'
        );
      }

      // ターゲットフォルダに新しいファイルディレクトリを作成
      const metadata = fileToMetadata(sourceFile);
      await FileSystemUtilsV2.createFileDirectory(
        targetFolderDir,
        fileId,
        metadata,
        sourceFile.content
      );

      // ソースファイルディレクトリを削除
      await FileSystemUtilsV2.deleteFileDirectory(sourceFileDir);
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to move file: ${fileId} to ${targetFolderPath}`,
        'MOVE_FILE_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // バージョン管理操作
  // =============================================================================

  /**
   * ファイルのバージョン履歴を取得
   *
   * @param fileId - ファイルID
   * @returns バージョンの配列
   */
  static async getVersions(fileId: string): Promise<FileVersion[]> {
    try {
      // バージョンIDのリストを取得
      const versionIds = await FileSystemUtilsV2.listVersions(fileId);

      // 各バージョンのコンテンツを並行読み込み
      const versions = await Promise.all(
        versionIds.map(async (versionId) => {
          const content = await FileSystemUtilsV2.readVersion(fileId, versionId);

          // バージョンメタデータを構築（versionIdから情報を推測）
          // ※実際にはメタデータファイルがないため、最小限の情報のみ
          const version: FileVersion = {
            id: versionId,
            fileId,
            content,
            version: 1, // 実際のバージョン番号は取得できない
            createdAt: new Date(), // 実際の作成日時は取得できない
          };

          return version;
        })
      );

      return versions;
    } catch (e) {
      throw new FileSystemV2Error(
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
   */
  static async getVersion(fileId: string, versionId: string): Promise<FileVersion | null> {
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
      throw new FileSystemV2Error(
        `Failed to get version: ${fileId}/${versionId}`,
        'GET_VERSION_ERROR',
        e
      );
    }
  }

  /**
   * ファイルを特定バージョンに復元
   *
   * @param fileId - ファイルID
   * @param versionId - バージョンID
   * @returns 復元されたファイル
   */
  static async restoreVersion(fileId: string, versionId: string): Promise<File> {
    try {
      const versionToRestore = await this.getVersion(fileId, versionId);
      if (!versionToRestore) {
        throw new FileSystemV2Error(
          `Version not found: ${fileId}/${versionId}`,
          'VERSION_NOT_FOUND'
        );
      }

      // ファイルをバージョンのコンテンツで更新
      return await this.updateWithVersion(fileId, {
        content: versionToRestore.content,
      });
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to restore version: ${fileId}/${versionId}`,
        'RESTORE_VERSION_ERROR',
        e
      );
    }
  }
}
