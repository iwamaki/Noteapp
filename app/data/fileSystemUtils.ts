/**
 * @file fileSystemUtils.ts
 * @summary Expo FileSystemを使用した低レベルファイルシステム操作
 * @description
 * メタデータとコンテンツを分離してファイルシステムに保存・読み込みする
 * ユーティリティ関数群。AsyncStorageの代替として使用。
 */

import { Paths, Directory, File as FSFile } from 'expo-file-system';

// --- ディレクトリパス定義 ---
// Paths.documentを使用して基本ディレクトリを作成
const BASE_DIR = new Directory(Paths.document, 'noteapp');
const METADATA_DIR = new Directory(BASE_DIR, 'metadata');
const CONTENTS_DIR = new Directory(BASE_DIR, 'contents');
const VERSION_CONTENTS_DIR = new Directory(BASE_DIR, 'version-contents');

// --- エラークラス ---
export class FileSystemError extends Error {
  constructor(message: string, public code: string, public originalError?: any) {
    super(message);
    this.name = 'FileSystemError';
  }
}

// --- 型定義（メタデータ用） ---
export interface FileMetadata {
  id: string;
  title: string;
  tags: string[];
  path: string;
  version: number;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface FolderMetadata {
  id: string;
  name: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

export interface VersionMetadata {
  id: string;
  fileId: string;
  version: number;
  createdAt: string;
}

// --- ディレクトリ初期化 ---

/**
 * ファイルシステムのディレクトリ構造を初期化
 * 必要なディレクトリが存在しない場合は作成する
 */
export const initializeFileSystem = async (): Promise<void> => {
  try {
    // ベースディレクトリの作成
    if (!(await BASE_DIR.exists)) {
      await BASE_DIR.create();
    }

    // メタデータディレクトリの作成
    if (!(await METADATA_DIR.exists)) {
      await METADATA_DIR.create();
    }

    // コンテンツディレクトリの作成
    if (!(await CONTENTS_DIR.exists)) {
      await CONTENTS_DIR.create();
    }

    // バージョンコンテンツディレクトリの作成
    if (!(await VERSION_CONTENTS_DIR.exists)) {
      await VERSION_CONTENTS_DIR.create();
    }

    // メタデータファイルの初期化（存在しない場合のみ）
    const filesMetaFile = new FSFile(METADATA_DIR, 'files.json');
    if (!(await filesMetaFile.exists)) {
      await filesMetaFile.write(JSON.stringify([]));
    }

    const foldersMetaFile = new FSFile(METADATA_DIR, 'folders.json');
    if (!(await foldersMetaFile.exists)) {
      await foldersMetaFile.write(JSON.stringify([]));
    }

    const versionsMetaFile = new FSFile(METADATA_DIR, 'versions-meta.json');
    if (!(await versionsMetaFile.exists)) {
      await versionsMetaFile.write(JSON.stringify([]));
    }
  } catch (e) {
    throw new FileSystemError(
      'Failed to initialize file system',
      'INIT_ERROR',
      e
    );
  }
};

// --- メタデータ操作 ---

/**
 * ファイルメタデータの読み込み
 */
export const readFilesMetadata = async (): Promise<FileMetadata[]> => {
  try {
    const file = new FSFile(METADATA_DIR, 'files.json');

    if (!(await file.exists)) {
      return [];
    }

    const content = await file.text();
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    throw new FileSystemError(
      'Failed to read files metadata',
      'READ_FILES_METADATA_ERROR',
      e
    );
  }
};

/**
 * ファイルメタデータの書き込み
 */
export const writeFilesMetadata = async (metadata: FileMetadata[]): Promise<void> => {
  try {
    const file = new FSFile(METADATA_DIR, 'files.json');
    await file.write(JSON.stringify(metadata, null, 2));
  } catch (e) {
    throw new FileSystemError(
      'Failed to write files metadata',
      'WRITE_FILES_METADATA_ERROR',
      e
    );
  }
};

/**
 * フォルダメタデータの読み込み
 */
export const readFoldersMetadata = async (): Promise<FolderMetadata[]> => {
  try {
    const file = new FSFile(METADATA_DIR, 'folders.json');

    if (!(await file.exists)) {
      return [];
    }

    const content = await file.text();
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    throw new FileSystemError(
      'Failed to read folders metadata',
      'READ_FOLDERS_METADATA_ERROR',
      e
    );
  }
};

/**
 * フォルダメタデータの書き込み
 */
export const writeFoldersMetadata = async (metadata: FolderMetadata[]): Promise<void> => {
  try {
    const file = new FSFile(METADATA_DIR, 'folders.json');
    await file.write(JSON.stringify(metadata, null, 2));
  } catch (e) {
    throw new FileSystemError(
      'Failed to write folders metadata',
      'WRITE_FOLDERS_METADATA_ERROR',
      e
    );
  }
};

/**
 * バージョンメタデータの読み込み
 */
export const readVersionsMetadata = async (): Promise<VersionMetadata[]> => {
  try {
    const file = new FSFile(METADATA_DIR, 'versions-meta.json');

    if (!(await file.exists)) {
      return [];
    }

    const content = await file.text();
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    throw new FileSystemError(
      'Failed to read versions metadata',
      'READ_VERSIONS_METADATA_ERROR',
      e
    );
  }
};

/**
 * バージョンメタデータの書き込み
 */
export const writeVersionsMetadata = async (metadata: VersionMetadata[]): Promise<void> => {
  try {
    const file = new FSFile(METADATA_DIR, 'versions-meta.json');
    await file.write(JSON.stringify(metadata, null, 2));
  } catch (e) {
    throw new FileSystemError(
      'Failed to write versions metadata',
      'WRITE_VERSIONS_METADATA_ERROR',
      e
    );
  }
};

// --- コンテンツ操作 ---

/**
 * ファイルコンテンツの読み込み
 */
export const readFileContent = async (fileId: string): Promise<string> => {
  try {
    const file = new FSFile(CONTENTS_DIR, `${fileId}.txt`);

    if (!(await file.exists)) {
      throw new FileSystemError(
        `File content not found: ${fileId}`,
        'CONTENT_NOT_FOUND'
      );
    }

    return await file.text();
  } catch (e) {
    if (e instanceof FileSystemError) {
      throw e;
    }
    throw new FileSystemError(
      `Failed to read file content: ${fileId}`,
      'READ_CONTENT_ERROR',
      e
    );
  }
};

/**
 * ファイルコンテンツの書き込み
 */
export const writeFileContent = async (fileId: string, content: string): Promise<void> => {
  try {
    const file = new FSFile(CONTENTS_DIR, `${fileId}.txt`);
    await file.write(content);
  } catch (e) {
    throw new FileSystemError(
      `Failed to write file content: ${fileId}`,
      'WRITE_CONTENT_ERROR',
      e
    );
  }
};

/**
 * ファイルコンテンツの削除
 */
export const deleteFileContent = async (fileId: string): Promise<void> => {
  try {
    const file = new FSFile(CONTENTS_DIR, `${fileId}.txt`);

    if (await file.exists) {
      await file.delete();
    }
  } catch (e) {
    throw new FileSystemError(
      `Failed to delete file content: ${fileId}`,
      'DELETE_CONTENT_ERROR',
      e
    );
  }
};

/**
 * バージョンコンテンツの読み込み
 */
export const readVersionContent = async (versionId: string): Promise<string> => {
  try {
    const file = new FSFile(VERSION_CONTENTS_DIR, `${versionId}.txt`);

    if (!(await file.exists)) {
      throw new FileSystemError(
        `Version content not found: ${versionId}`,
        'VERSION_CONTENT_NOT_FOUND'
      );
    }

    return await file.text();
  } catch (e) {
    if (e instanceof FileSystemError) {
      throw e;
    }
    throw new FileSystemError(
      `Failed to read version content: ${versionId}`,
      'READ_VERSION_CONTENT_ERROR',
      e
    );
  }
};

/**
 * バージョンコンテンツの書き込み
 */
export const writeVersionContent = async (versionId: string, content: string): Promise<void> => {
  try {
    const file = new FSFile(VERSION_CONTENTS_DIR, `${versionId}.txt`);
    await file.write(content);
  } catch (e) {
    throw new FileSystemError(
      `Failed to write version content: ${versionId}`,
      'WRITE_VERSION_CONTENT_ERROR',
      e
    );
  }
};

/**
 * バージョンコンテンツの削除
 */
export const deleteVersionContent = async (versionId: string): Promise<void> => {
  try {
    const file = new FSFile(VERSION_CONTENTS_DIR, `${versionId}.txt`);

    if (await file.exists) {
      await file.delete();
    }
  } catch (e) {
    throw new FileSystemError(
      `Failed to delete version content: ${versionId}`,
      'DELETE_VERSION_CONTENT_ERROR',
      e
    );
  }
};

// --- ユーティリティ関数 ---

/**
 * ファイルシステムの状態を取得（デバッグ用）
 */
export const getFileSystemInfo = async (): Promise<{
  baseDir: string;
  exists: boolean;
  filesCount: number;
  foldersCount: number;
  versionsCount: number;
}> => {
  try {
    const baseDirExists = await BASE_DIR.exists;

    if (!baseDirExists) {
      return {
        baseDir: BASE_DIR.uri,
        exists: false,
        filesCount: 0,
        foldersCount: 0,
        versionsCount: 0,
      };
    }

    const filesMetadata = await readFilesMetadata();
    const foldersMetadata = await readFoldersMetadata();
    const versionsMetadata = await readVersionsMetadata();

    return {
      baseDir: BASE_DIR.uri,
      exists: true,
      filesCount: filesMetadata.length,
      foldersCount: foldersMetadata.length,
      versionsCount: versionsMetadata.length,
    };
  } catch (e) {
    throw new FileSystemError(
      'Failed to get file system info',
      'GET_INFO_ERROR',
      e
    );
  }
};

/**
 * ファイルシステムの完全削除（テスト用）
 * 警告: すべてのデータが削除されます
 */
export const deleteFileSystem = async (): Promise<void> => {
  try {
    if (await BASE_DIR.exists) {
      await BASE_DIR.delete();
    }
  } catch (e) {
    throw new FileSystemError(
      'Failed to delete file system',
      'DELETE_FILESYSTEM_ERROR',
      e
    );
  }
};
