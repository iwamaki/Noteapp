import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Folder, FileVersion, FileMetadata, FolderMetadata, VersionMetadata, fileToMetadata, metadataToFile, folderToMetadata, metadataToFolder, versionToMetadata, metadataToVersion } from './type';
import StorageUtils from './asyncStorageUtils';
import * as FileSystemUtils from './fileSystemUtils';

// --- Storage Keys ---
export const STORAGE_KEYS = {
  FILES: '@files',
  FOLDERS: '@folders',
  FILE_VERSIONS: '@file_versions',
} as const;

// --- Error Class ---
export class StorageError extends Error {
  constructor(message: string, public code: string, public originalError?: any) {
    super(message);
    this.name = 'StorageError';
  }
}

// --- Raw File Methods ---
export const getAllFilesRaw = async (): Promise<File[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.FILES);
    const files = await StorageUtils.safeJsonParse<any[]>(jsonValue);
    if (!files) return [];
    return files.map(file => StorageUtils.convertDates(file) as File);
  } catch (e) {
    throw new StorageError('Failed to retrieve files', 'FETCH_ERROR', e);
  }
};

export const saveAllFiles = async (files: File[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(files));
  } catch (e) {
    throw new StorageError('Failed to save files', 'SAVE_ERROR', e);
  }
};

// --- Raw Folder Methods ---
export const getAllFoldersRaw = async (): Promise<Folder[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.FOLDERS);
    const folders = await StorageUtils.safeJsonParse<any[]>(jsonValue);
    if (!folders) return [];
    return folders.map(folder => StorageUtils.convertDates(folder) as Folder);
  } catch (e) {
    throw new StorageError('Failed to retrieve folders', 'FETCH_FOLDERS_ERROR', e);
  }
};

export const saveAllFolders = async (folders: Folder[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
  } catch (e) {
    throw new StorageError('Failed to save folders', 'SAVE_FOLDERS_ERROR', e);
  }
};

// --- Raw File Version Methods ---
export const getAllVersionsRaw = async (): Promise<FileVersion[]> => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEYS.FILE_VERSIONS);
    const versions = await StorageUtils.safeJsonParse<any[]>(jsonValue);
    if (!versions) return [];
    return versions.map(version => StorageUtils.convertDates(version) as FileVersion);
  } catch (e) {
    throw new StorageError('Failed to retrieve file versions', 'FETCH_VERSIONS_ERROR', e);
  }
};

export const saveAllVersions = async (versions: FileVersion[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FILE_VERSIONS, JSON.stringify(versions));
  } catch (e) {
    throw new StorageError('Failed to save file versions', 'SAVE_VERSIONS_ERROR', e);
  }
};

// =============================================================================
// FileSystem版の実装（Phase 2）
// =============================================================================

/**
 * メタデータキャッシュクラス（内部実装）
 * パフォーマンス最適化のため、メタデータをメモリにキャッシュする
 */
class MetadataCache {
  private static filesCache: FileMetadata[] | null = null;
  private static foldersCache: FolderMetadata[] | null = null;
  private static versionsCache: VersionMetadata[] | null = null;
  private static cacheTimestamp: number | null = null;
  private static TTL = 5 * 60 * 1000; // 5分

  /**
   * ファイルメタデータを取得（キャッシュ付き）
   */
  static async getFiles(): Promise<FileMetadata[]> {
    if (this.filesCache && this.isValid()) {
      return this.filesCache;
    }
    this.filesCache = await FileSystemUtils.readFilesMetadata();
    this.updateTimestamp();
    return this.filesCache;
  }

  /**
   * フォルダメタデータを取得（キャッシュ付き）
   */
  static async getFolders(): Promise<FolderMetadata[]> {
    if (this.foldersCache && this.isValid()) {
      return this.foldersCache;
    }
    this.foldersCache = await FileSystemUtils.readFoldersMetadata();
    this.updateTimestamp();
    return this.foldersCache;
  }

  /**
   * バージョンメタデータを取得（キャッシュ付き）
   */
  static async getVersions(): Promise<VersionMetadata[]> {
    if (this.versionsCache && this.isValid()) {
      return this.versionsCache;
    }
    this.versionsCache = await FileSystemUtils.readVersionsMetadata();
    this.updateTimestamp();
    return this.versionsCache;
  }

  /**
   * キャッシュを無効化
   */
  static invalidate(): void {
    this.filesCache = null;
    this.foldersCache = null;
    this.versionsCache = null;
    this.cacheTimestamp = null;
  }

  /**
   * キャッシュの有効性チェック
   */
  private static isValid(): boolean {
    if (!this.cacheTimestamp) return false;
    return Date.now() - this.cacheTimestamp < this.TTL;
  }

  /**
   * タイムスタンプを更新
   */
  private static updateTimestamp(): void {
    this.cacheTimestamp = Date.now();
  }
}

// --- FileSystem版: ファイル操作 ---

/**
 * FileSystem版: すべてのファイルを取得
 * メタデータとコンテンツを個別に読み込んで結合
 */
export const getAllFilesRawFS = async (): Promise<File[]> => {
  try {
    // 1. メタデータをキャッシュから取得
    const metadata = await MetadataCache.getFiles();

    // 2. 各ファイルのコンテンツを並行読み込み
    const files = await Promise.all(
      metadata.map(async (meta) => {
        const content = await FileSystemUtils.readFileContent(meta.id);
        return metadataToFile(meta, content);
      })
    );

    return files;
  } catch (e) {
    throw new StorageError('Failed to retrieve files from FileSystem', 'FETCH_FS_ERROR', e);
  }
};

/**
 * FileSystem版: すべてのファイルを保存
 * メタデータとコンテンツを分離して保存し、キャッシュを無効化
 */
export const saveAllFilesFS = async (files: File[]): Promise<void> => {
  try {
    // 1. メタデータとコンテンツに分離
    const metadata = files.map(fileToMetadata);

    // 2. メタデータを保存
    await FileSystemUtils.writeFilesMetadata(metadata);

    // 3. 各ファイルのコンテンツを並行保存
    await Promise.all(
      files.map(async (file) => {
        await FileSystemUtils.writeFileContent(file.id, file.content);
      })
    );

    // 4. キャッシュを無効化
    MetadataCache.invalidate();
  } catch (e) {
    throw new StorageError('Failed to save files to FileSystem', 'SAVE_FS_ERROR', e);
  }
};

// --- FileSystem版: フォルダ操作 ---

/**
 * FileSystem版: すべてのフォルダを取得
 */
export const getAllFoldersRawFS = async (): Promise<Folder[]> => {
  try {
    // メタデータをキャッシュから取得して変換
    const metadata = await MetadataCache.getFolders();
    return metadata.map(metadataToFolder);
  } catch (e) {
    throw new StorageError('Failed to retrieve folders from FileSystem', 'FETCH_FOLDERS_FS_ERROR', e);
  }
};

/**
 * FileSystem版: すべてのフォルダを保存
 */
export const saveAllFoldersFS = async (folders: Folder[]): Promise<void> => {
  try {
    // メタデータに変換して保存
    const metadata = folders.map(folderToMetadata);
    await FileSystemUtils.writeFoldersMetadata(metadata);

    // キャッシュを無効化
    MetadataCache.invalidate();
  } catch (e) {
    throw new StorageError('Failed to save folders to FileSystem', 'SAVE_FOLDERS_FS_ERROR', e);
  }
};

// --- FileSystem版: バージョン操作 ---

/**
 * FileSystem版: すべてのバージョンを取得
 * メタデータとコンテンツを個別に読み込んで結合
 */
export const getAllVersionsRawFS = async (): Promise<FileVersion[]> => {
  try {
    // 1. メタデータをキャッシュから取得
    const metadata = await MetadataCache.getVersions();

    // 2. 各バージョンのコンテンツを並行読み込み
    const versions = await Promise.all(
      metadata.map(async (meta) => {
        const content = await FileSystemUtils.readVersionContent(meta.id);
        return metadataToVersion(meta, content);
      })
    );

    return versions;
  } catch (e) {
    throw new StorageError('Failed to retrieve file versions from FileSystem', 'FETCH_VERSIONS_FS_ERROR', e);
  }
};

/**
 * FileSystem版: すべてのバージョンを保存
 * メタデータとコンテンツを分離して保存し、キャッシュを無効化
 */
export const saveAllVersionsFS = async (versions: FileVersion[]): Promise<void> => {
  try {
    // 1. メタデータとコンテンツに分離
    const metadata = versions.map(versionToMetadata);

    // 2. メタデータを保存
    await FileSystemUtils.writeVersionsMetadata(metadata);

    // 3. 各バージョンのコンテンツを並行保存
    await Promise.all(
      versions.map(async (version) => {
        await FileSystemUtils.writeVersionContent(version.id, version.content);
      })
    );

    // 4. キャッシュを無効化
    MetadataCache.invalidate();
  } catch (e) {
    throw new StorageError('Failed to save file versions to FileSystem', 'SAVE_VERSIONS_FS_ERROR', e);
  }
};

// --- パフォーマンス最適化: 遅延読み込み関数（オプション） ---

/**
 * メタデータのみを取得（コンテンツなし）
 * ファイル一覧表示など、コンテンツが不要な場合に使用
 */
export const getFilesMetadataOnlyFS = async (): Promise<Omit<File, 'content'>[]> => {
  try {
    const metadata = await MetadataCache.getFiles();
    return metadata.map(meta => ({
      id: meta.id,
      title: meta.title,
      tags: meta.tags,
      path: meta.path,
      version: meta.version,
      createdAt: new Date(meta.createdAt),
      updatedAt: new Date(meta.updatedAt),
      content: '', // 空文字列をデフォルトとして設定
    }));
  } catch (e) {
    throw new StorageError('Failed to retrieve file metadata', 'FETCH_METADATA_ERROR', e);
  }
};

/**
 * 特定のファイルのコンテンツのみを取得
 * 遅延読み込みで使用
 */
export const getFileContentByIdFS = async (fileId: string): Promise<string> => {
  try {
    return await FileSystemUtils.readFileContent(fileId);
  } catch (e) {
    throw new StorageError(`Failed to retrieve file content: ${fileId}`, 'FETCH_CONTENT_ERROR', e);
  }
};

/**
 * 特定のバージョンのコンテンツのみを取得
 */
export const getVersionContentByIdFS = async (versionId: string): Promise<string> => {
  try {
    return await FileSystemUtils.readVersionContent(versionId);
  } catch (e) {
    throw new StorageError(`Failed to retrieve version content: ${versionId}`, 'FETCH_VERSION_CONTENT_ERROR', e);
  }
};
