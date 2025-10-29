/**
 * @file fileRepositoryFlat.ts
 * @summary フラット構造のファイルリポジトリ
 * @description
 * フォルダ階層を廃止し、全ファイルをフラット構造で管理。
 * シンプルで効率的なCRUD操作を提供。
 *
 * ストレージ構造:
 * noteapp/content/
 * ├── {file-uuid-1}/
 * │   ├── meta.json
 * │   └── content.md
 * ├── {file-uuid-2}/
 * │   ├── meta.json
 * │   └── content.md
 * └── ...
 *
 * 主な特徴:
 * - フォルダ概念なし（完全フラット）
 * - getAll()で全ファイル取得可能
 * - move()不要（パス概念がない）
 * - シンプルな実装（~200行程度）
 */

import { v4 as uuidv4 } from 'uuid';
import { Paths, Directory, File as FSFile } from 'expo-file-system';
import type {
  FileFlat,
  FileMetadataFlat,
  CreateFileDataFlat,
  UpdateFileDataFlat,
  FileVersionFlat,
  VersionMetadataFlat,
} from '../core/typesFlat';
import { FileSystemV2Error, RepositoryError } from '../core/errors';

// Re-export errors for consumers
export { FileSystemV2Error, RepositoryError };

// =============================================================================
// Constants
// =============================================================================

const BASE_DIR = new Directory(Paths.document, 'noteapp');
const CONTENT_DIR = new Directory(BASE_DIR, 'content');
const VERSIONS_DIR_NAME = 'versions';
const FILE_METADATA_FILENAME = 'meta.json';
const FILE_CONTENT_FILENAME = 'content.md';
const VERSION_METADATA_FILENAME = 'version_meta.json';
const VERSION_CONTENT_FILENAME = 'version_content.md';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * FileMetadataからFileFlatに変換
 */
const metadataToFile = (metadata: FileMetadataFlat, content: string): FileFlat => {
  return {
    id: metadata.id,
    title: metadata.title,
    content,
    tags: metadata.tags,
    categories: metadata.categories,
    summary: metadata.summary,
    relatedNoteIds: metadata.relatedNoteIds,
    embedding: metadata.embedding,
    version: metadata.version,
    createdAt: new Date(metadata.createdAt),
    updatedAt: new Date(metadata.updatedAt),
  };
};

/**
 * FileFlatからFileMetadataに変換
 */
const fileToMetadata = (file: FileFlat): FileMetadataFlat => {
  return {
    id: file.id,
    title: file.title,
    tags: file.tags,
    categories: file.categories,
    summary: file.summary,
    relatedNoteIds: file.relatedNoteIds,
    embedding: file.embedding,
    version: file.version,
    createdAt: file.createdAt.toISOString(),
    updatedAt: file.updatedAt.toISOString(),
  };
};

/**
 * ファイルメタデータを読み込み
 */
const readFileMetadata = async (fileDir: Directory): Promise<FileMetadataFlat | null> => {
  try {
    const metadataFile = new FSFile(fileDir, FILE_METADATA_FILENAME);
    if (!(await metadataFile.exists)) {
      return null;
    }
    const text = await metadataFile.text();
    return JSON.parse(text) as FileMetadataFlat;
  } catch (e) {
    console.error('Failed to read file metadata:', e);
    return null;
  }
};

/**
 * ファイルコンテンツを読み込み
 */
const readFileContent = async (fileDir: Directory): Promise<string | null> => {
  try {
    const contentFile = new FSFile(fileDir, FILE_CONTENT_FILENAME);
    if (!(await contentFile.exists)) {
      return null;
    }
    return await contentFile.text();
  } catch (e) {
    console.error('Failed to read file content:', e);
    return null;
  }
};

/**
 * ファイルメタデータを書き込み
 */
const writeFileMetadata = async (
  fileDir: Directory,
  metadata: FileMetadataFlat
): Promise<void> => {
  try {
    const metadataFile = new FSFile(fileDir, FILE_METADATA_FILENAME);
    await metadataFile.write(JSON.stringify(metadata, null, 2));
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to write file metadata',
      'WRITE_METADATA_ERROR',
      e
    );
  }
};

/**
 * ファイルコンテンツを書き込み
 */
const writeFileContent = async (fileDir: Directory, content: string): Promise<void> => {
  try {
    const contentFile = new FSFile(fileDir, FILE_CONTENT_FILENAME);
    await contentFile.write(content);
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to write file content',
      'WRITE_CONTENT_ERROR',
      e
    );
  }
};

/**
 * ファイルディレクトリを削除
 */
const deleteFileDirectory = async (fileDir: Directory): Promise<void> => {
  try {
    if (await fileDir.exists) {
      await fileDir.delete();
    }
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to delete file directory',
      'DELETE_FILE_DIR_ERROR',
      e
    );
  }
};

/**
 * バージョンメタデータを読み込み
 */
const readVersionMetadata = async (versionDir: Directory): Promise<VersionMetadataFlat | null> => {
  try {
    const metadataFile = new FSFile(versionDir, VERSION_METADATA_FILENAME);
    if (!(await metadataFile.exists)) {
      return null;
    }
    const text = await metadataFile.text();
    return JSON.parse(text) as VersionMetadataFlat;
  } catch (e) {
    console.error('Failed to read version metadata:', e);
    return null;
  }
};

/**
 * バージョンコンテンツを読み込み
 */
const readVersionContent = async (versionDir: Directory): Promise<string | null> => {
  try {
    const contentFile = new FSFile(versionDir, VERSION_CONTENT_FILENAME);
    if (!(await contentFile.exists)) {
      return null;
    }
    return await contentFile.text();
  } catch (e) {
    console.error('Failed to read version content:', e);
    return null;
  }
};

/**
 * バージョンメタデータを書き込み
 */
const writeVersionMetadata = async (
  versionDir: Directory,
  metadata: VersionMetadataFlat
): Promise<void> => {
  try {
    const metadataFile = new FSFile(versionDir, VERSION_METADATA_FILENAME);
    await metadataFile.write(JSON.stringify(metadata, null, 2));
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to write version metadata',
      'WRITE_VERSION_METADATA_ERROR',
      e
    );
  }
};

/**
 * バージョンコンテンツを書き込み
 */
const writeVersionContent = async (versionDir: Directory, content: string): Promise<void> => {
  try {
    const contentFile = new FSFile(versionDir, VERSION_CONTENT_FILENAME);
    await contentFile.write(content);
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to write version content',
      'WRITE_VERSION_CONTENT_ERROR',
      e
    );
  }
};

// =============================================================================
// Initialization
// =============================================================================

/**
 * フラット構造のファイルシステムを初期化
 */
export const initializeFileSystemFlat = async (): Promise<void> => {
  try {
    // ベースディレクトリの作成
    if (!(await BASE_DIR.exists)) {
      await BASE_DIR.create();
    }

    // コンテンツディレクトリの作成
    if (!(await CONTENT_DIR.exists)) {
      await CONTENT_DIR.create();
    }
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to initialize file system',
      'INIT_FILE_SYSTEM_ERROR',
      e
    );
  }
};

// =============================================================================
// FileRepositoryFlat Class
// =============================================================================

/**
 * フラット構造のファイルリポジトリ
 * すべてのファイルCRUD操作を提供
 */
export class FileRepositoryFlat {
  // =============================================================================
  // 基本的な取得操作
  // =============================================================================

  /**
   * すべてのファイルを取得
   *
   * @returns 全ファイルの配列
   *
   * @example
   * const files = await FileRepositoryFlat.getAll();
   *
   * @remarks
   * フラット構造なので、contentディレクトリ直下の全ファイルを取得。
   * フォルダの概念がないため、シンプルな実装。
   */
  static async getAll(): Promise<FileFlat[]> {
    try {
      // コンテンツディレクトリが存在しない場合は空配列を返す
      if (!(await CONTENT_DIR.exists)) {
        return [];
      }

      // コンテンツディレクトリ内の全アイテムを取得
      const items = await CONTENT_DIR.list();

      // ファイルディレクトリのみをフィルタリング
      const filePromises = items
        .filter((item) => item instanceof Directory)
        .map(async (item) => {
          const fileDir = item as Directory;

          // メタデータを読み込み
          const metadata = await readFileMetadata(fileDir);
          if (!metadata) {
            return null;
          }

          // コンテンツを読み込み
          const content = await readFileContent(fileDir);
          if (content === null) {
            return null;
          }

          return metadataToFile(metadata, content);
        });

      // 並行処理して結果を取得
      const results = await Promise.all(filePromises);

      // nullを除外して返す
      return results.filter((file): file is FileFlat => file !== null);
    } catch (e) {
      throw new FileSystemV2Error(
        'Failed to get all files',
        'GET_ALL_FILES_ERROR',
        e
      );
    }
  }

  /**
   * IDでファイルを取得
   *
   * @param id - ファイルID
   * @returns ファイル、存在しない場合はnull
   *
   * @example
   * const file = await FileRepositoryFlat.getById('file-uuid-123');
   */
  static async getById(id: string): Promise<FileFlat | null> {
    try {
      const fileDir = new Directory(CONTENT_DIR, id);

      // ディレクトリが存在しない場合はnull
      if (!(await fileDir.exists)) {
        return null;
      }

      // メタデータを読み込み
      const metadata = await readFileMetadata(fileDir);
      if (!metadata) {
        return null;
      }

      // コンテンツを読み込み
      const content = await readFileContent(fileDir);
      if (content === null) {
        return null;
      }

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
   * 複数のファイルをIDで取得
   *
   * @param fileIds - ファイルIDの配列
   * @returns ファイルの配列
   */
  static async getByIds(fileIds: string[]): Promise<FileFlat[]> {
    try {
      // 並行取得
      const results = await Promise.all(
        fileIds.map(async (id) => {
          return await this.getById(id);
        })
      );

      // nullを除外
      return results.filter((file): file is FileFlat => file !== null);
    } catch (e) {
      throw new FileSystemV2Error(
        'Failed to get files by IDs',
        'GET_FILES_BY_IDS_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // 作成・更新操作
  // =============================================================================

  /**
   * ファイルを作成
   *
   * @param data - ファイル作成データ
   * @returns 作成されたファイル
   *
   * @example
   * const file = await FileRepositoryFlat.create({
   *   title: 'My Note',
   *   content: 'Note content...',
   *   tags: ['important'],
   *   categories: ['研究'],
   * });
   */
  static async create(data: CreateFileDataFlat): Promise<FileFlat> {
    try {
      // ファイルシステムの初期化（念のため）
      await initializeFileSystemFlat();

      const now = new Date();
      const fileId = uuidv4();

      const newFile: FileFlat = {
        id: fileId,
        title: data.title,
        content: data.content,
        tags: data.tags || [],
        categories: data.categories || [],
        summary: data.summary,
        relatedNoteIds: data.relatedNoteIds,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };

      const metadata = fileToMetadata(newFile);

      // ファイルディレクトリを作成
      const fileDir = new Directory(CONTENT_DIR, fileId);
      if (!(await fileDir.exists)) {
        await fileDir.create();
      }

      // メタデータとコンテンツを書き込み
      await writeFileMetadata(fileDir, metadata);
      await writeFileContent(fileDir, data.content);

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
   * ファイルを更新
   *
   * @param id - ファイルID
   * @param data - 更新データ
   * @returns 更新されたファイル
   */
  static async update(id: string, data: UpdateFileDataFlat): Promise<FileFlat> {
    try {
      // 既存のファイルを取得
      const existingFile = await this.getById(id);
      if (!existingFile) {
        throw new FileSystemV2Error(`File not found: ${id}`, 'FILE_NOT_FOUND');
      }

      // コンテンツが更新された場合、現在のバージョンを履歴として保存
      if (data.content !== undefined && data.content !== existingFile.content) {
        await this.saveVersion(id, existingFile.content, existingFile.version);
      }

      // 更新されたファイル
      const updatedFile: FileFlat = {
        ...existingFile,
        title: data.title ?? existingFile.title,
        content: data.content ?? existingFile.content,
        tags: data.tags ?? existingFile.tags,
        categories: data.categories ?? existingFile.categories,
        summary: data.summary ?? existingFile.summary,
        relatedNoteIds: data.relatedNoteIds ?? existingFile.relatedNoteIds,
        embedding: data.embedding ?? existingFile.embedding,
        version: existingFile.version + 1,
        updatedAt: new Date(),
      };

      const metadata = fileToMetadata(updatedFile);

      // ファイルディレクトリ
      const fileDir = new Directory(CONTENT_DIR, id);

      // メタデータを書き込み
      await writeFileMetadata(fileDir, metadata);

      // コンテンツが更新された場合は書き込み
      if (data.content !== undefined) {
        await writeFileContent(fileDir, data.content);
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

  // =============================================================================
  // 削除操作
  // =============================================================================

  /**
   * ファイルを削除
   *
   * @param id - ファイルID
   */
  static async delete(id: string): Promise<void> {
    try {
      const fileDir = new Directory(CONTENT_DIR, id);

      // 存在しない場合は成功とみなす
      if (!(await fileDir.exists)) {
        return;
      }

      // ディレクトリを削除
      await deleteFileDirectory(fileDir);
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to delete file: ${id}`,
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
        'Failed to batch delete files',
        'BATCH_DELETE_FILES_ERROR',
        e
      );
    }
  }

  // =============================================================================
  // バージョン管理操作
  // =============================================================================

  /**
   * バージョン履歴を保存
   * updateメソッドから呼び出される内部メソッド
   *
   * @param fileId - ファイルID
   * @param content - 保存するコンテンツ
   * @param version - バージョン番号
   */
  private static async saveVersion(
    fileId: string,
    content: string,
    version: number
  ): Promise<void> {
    try {
      const versionId = uuidv4();
      const fileDir = new Directory(CONTENT_DIR, fileId);
      const versionsDir = new Directory(fileDir, VERSIONS_DIR_NAME);

      // versionsディレクトリが存在しない場合は作成
      if (!(await versionsDir.exists)) {
        await versionsDir.create();
      }

      // バージョンディレクトリを作成
      const versionDir = new Directory(versionsDir, versionId);
      if (!(await versionDir.exists)) {
        await versionDir.create();
      }

      // バージョンメタデータを作成
      const versionMetadata: VersionMetadataFlat = {
        id: versionId,
        fileId,
        version,
        createdAt: new Date().toISOString(),
      };

      // メタデータとコンテンツを書き込み
      await writeVersionMetadata(versionDir, versionMetadata);
      await writeVersionContent(versionDir, content);
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to save version for file: ${fileId}`,
        'SAVE_VERSION_ERROR',
        e
      );
    }
  }

  /**
   * ファイルのバージョン履歴を取得
   *
   * @param fileId - ファイルID
   * @returns バージョン履歴の配列
   *
   * @example
   * const versions = await FileRepositoryFlat.getVersions('file-uuid-123');
   */
  static async getVersions(fileId: string): Promise<FileVersionFlat[]> {
    try {
      const fileDir = new Directory(CONTENT_DIR, fileId);

      // ファイルが存在しない場合は空配列を返す
      if (!(await fileDir.exists)) {
        return [];
      }

      const versionsDir = new Directory(fileDir, VERSIONS_DIR_NAME);

      // versionsディレクトリが存在しない場合は空配列を返す
      if (!(await versionsDir.exists)) {
        return [];
      }

      // versionsディレクトリ内の全アイテムを取得
      const items = await versionsDir.list();

      // バージョンディレクトリのみをフィルタリング
      const versionPromises = items
        .filter((item) => item instanceof Directory)
        .map(async (item) => {
          const versionDir = item as Directory;

          // メタデータを読み込み
          const metadata = await readVersionMetadata(versionDir);
          if (!metadata) {
            return null;
          }

          // コンテンツを読み込み
          const content = await readVersionContent(versionDir);
          if (content === null) {
            return null;
          }

          const version: FileVersionFlat = {
            id: metadata.id,
            fileId: metadata.fileId,
            content,
            version: metadata.version,
            createdAt: new Date(metadata.createdAt),
          };

          return version;
        });

      // 並行処理して結果を取得
      const results = await Promise.all(versionPromises);

      // nullを除外して返す
      return results.filter((version): version is FileVersionFlat => version !== null);
    } catch (e) {
      throw new FileSystemV2Error(
        `Failed to get versions for file: ${fileId}`,
        'GET_VERSIONS_ERROR',
        e
      );
    }
  }

  /**
   * バージョンを復元
   *
   * @param fileId - ファイルID
   * @param versionId - バージョンID
   * @returns 復元されたファイル
   *
   * @example
   * await FileRepositoryFlat.restoreVersion('file-uuid-123', 'version-uuid-456');
   */
  static async restoreVersion(fileId: string, versionId: string): Promise<FileFlat> {
    try {
      // 現在のファイルを取得
      const currentFile = await this.getById(fileId);
      if (!currentFile) {
        throw new FileSystemV2Error(`File not found: ${fileId}`, 'FILE_NOT_FOUND');
      }

      // 指定されたバージョンを取得
      const fileDir = new Directory(CONTENT_DIR, fileId);
      const versionsDir = new Directory(fileDir, VERSIONS_DIR_NAME);
      const versionDir = new Directory(versionsDir, versionId);

      if (!(await versionDir.exists)) {
        throw new FileSystemV2Error(
          `Version not found: ${versionId}`,
          'VERSION_NOT_FOUND'
        );
      }

      // バージョンのコンテンツを読み込み
      const versionContent = await readVersionContent(versionDir);
      if (versionContent === null) {
        throw new FileSystemV2Error(
          `Version content not found: ${versionId}`,
          'VERSION_CONTENT_NOT_FOUND'
        );
      }

      // 現在のファイルをバージョン履歴として保存（復元前の状態を保存）
      await this.saveVersion(fileId, currentFile.content, currentFile.version);

      // ファイルを更新（復元）
      const restoredFile = await this.update(fileId, {
        content: versionContent,
      });

      return restoredFile;
    } catch (e) {
      if (e instanceof FileSystemV2Error) {
        throw e;
      }
      throw new FileSystemV2Error(
        `Failed to restore version: ${versionId}`,
        'RESTORE_VERSION_ERROR',
        e
      );
    }
  }
}
