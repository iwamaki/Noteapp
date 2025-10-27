/**
 * @file fileSystemUtilsV2.ts
 * @summary V2 FileSystem操作 - 階層的ディレクトリ構造を活用
 * @description
 * expo-file-systemの自然な階層構造を最大限活用した低レベルAPI。
 * V1のフラットなメタデータJSON構造から、分散配置されたメタデータファイルへ移行。
 *
 * ディレクトリ構造:
 * noteapp/
 * ├── content/
 * │   ├── root/                      ← ルートフォルダ
 * │   │   ├── .folder.json           ← フォルダメタデータ
 * │   │   ├── {uuid-file1}/
 * │   │   │   ├── content.md         ← ファイル本文
 * │   │   │   └── meta.json          ← ファイルメタデータ
 * │   │   └── {uuid-file2}/
 * │   ├── folder1/                   ← フォルダ（ディレクトリ名=slug）
 * │   │   ├── .folder.json
 * │   │   └── subfolder/
 * │   └── another-folder/
 * └── versions/
 *     ├── {fileId}/
 *     │   ├── {versionId-1}.md
 *     │   └── {versionId-2}.md
 */

import { Paths, Directory, File as FSFile } from 'expo-file-system';
import type {
  FileMetadata,
  FolderMetadata,
  VersionMetadata,
} from './types';

// =============================================================================
// Directory Path Definitions
// =============================================================================

const BASE_DIR = new Directory(Paths.document, 'noteapp');
const CONTENT_DIR = new Directory(BASE_DIR, 'content');
const VERSIONS_DIR = new Directory(BASE_DIR, 'versions');

// ルートフォルダのディレクトリ（常に存在する特別なフォルダ）
const ROOT_DIR = new Directory(CONTENT_DIR, 'root');

// =============================================================================
// Constants
// =============================================================================

const FOLDER_METADATA_FILENAME = '.folder.json';
const FILE_METADATA_FILENAME = 'meta.json';
const FILE_CONTENT_FILENAME = 'content.md';

// =============================================================================
// Error Class
// =============================================================================

export class FileSystemV2Error extends Error {
  constructor(message: string, public code: string, public originalError?: any) {
    super(message);
    this.name = 'FileSystemV2Error';
  }
}

// =============================================================================
// Directory Initialization
// =============================================================================

/**
 * V2ファイルシステムのディレクトリ構造を初期化
 *
 * - noteapp/content/ ディレクトリを作成
 * - noteapp/content/root/ ディレクトリを作成（ルートフォルダ）
 * - noteapp/versions/ ディレクトリを作成
 * - root/.folder.json を初期化
 */
export const initializeFileSystemV2 = async (): Promise<void> => {
  try {
    // ベースディレクトリの作成
    if (!(await BASE_DIR.exists)) {
      await BASE_DIR.create();
    }

    // コンテンツディレクトリの作成
    if (!(await CONTENT_DIR.exists)) {
      await CONTENT_DIR.create();
    }

    // ルートフォルダディレクトリの作成
    if (!(await ROOT_DIR.exists)) {
      await ROOT_DIR.create();
    }

    // バージョンディレクトリの作成
    if (!(await VERSIONS_DIR.exists)) {
      await VERSIONS_DIR.create();
    }

    // ルートフォルダのメタデータを初期化
    const rootMetadataFile = new FSFile(ROOT_DIR, FOLDER_METADATA_FILENAME);
    if (!(await rootMetadataFile.exists)) {
      const rootMetadata: FolderMetadata = {
        id: 'root',
        name: 'Root',
        slug: 'root',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await rootMetadataFile.write(JSON.stringify(rootMetadata, null, 2));
    }
  } catch (e) {
    throw new FileSystemV2Error(
      'Failed to initialize V2 file system',
      'INIT_V2_ERROR',
      e
    );
  }
};

// =============================================================================
// Folder Operations
// =============================================================================

/**
 * フォルダディレクトリを作成
 *
 * @param parentDir - 親フォルダのDirectory
 * @param folderSlug - フォルダのslug（ディレクトリ名）
 * @param metadata - フォルダメタデータ
 */
export const createFolderDirectory = async (
  parentDir: Directory,
  folderSlug: string,
  metadata: FolderMetadata
): Promise<void> => {
  try {
    const folderDir = new Directory(parentDir, folderSlug);

    // ディレクトリ作成
    if (await folderDir.exists) {
      throw new FileSystemV2Error(
        `Folder directory already exists: ${folderSlug}`,
        'FOLDER_ALREADY_EXISTS'
      );
    }

    await folderDir.create();

    // メタデータファイルを作成
    const metadataFile = new FSFile(folderDir, FOLDER_METADATA_FILENAME);
    await metadataFile.write(JSON.stringify(metadata, null, 2));
  } catch (e) {
    if (e instanceof FileSystemV2Error) {
      throw e;
    }
    throw new FileSystemV2Error(
      `Failed to create folder directory: ${folderSlug}`,
      'CREATE_FOLDER_DIR_ERROR',
      e
    );
  }
};

/**
 * フォルダメタデータを読み込み
 *
 * @param folderDir - フォルダのDirectory
 * @returns フォルダメタデータ、存在しない場合はnull
 */
export const readFolderMetadata = async (
  folderDir: Directory
): Promise<FolderMetadata | null> => {
  try {
    const metadataFile = new FSFile(folderDir, FOLDER_METADATA_FILENAME);

    if (!(await metadataFile.exists)) {
      return null;
    }

    const content = await metadataFile.text();
    return JSON.parse(content) as FolderMetadata;
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to read folder metadata: ${folderDir.uri}`,
      'READ_FOLDER_METADATA_ERROR',
      e
    );
  }
};

/**
 * フォルダメタデータを書き込み
 *
 * @param folderDir - フォルダのDirectory
 * @param metadata - フォルダメタデータ
 */
export const writeFolderMetadata = async (
  folderDir: Directory,
  metadata: FolderMetadata
): Promise<void> => {
  try {
    const metadataFile = new FSFile(folderDir, FOLDER_METADATA_FILENAME);
    await metadataFile.write(JSON.stringify(metadata, null, 2));
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to write folder metadata: ${folderDir.uri}`,
      'WRITE_FOLDER_METADATA_ERROR',
      e
    );
  }
};

/**
 * フォルダディレクトリを削除（中身も含めて削除）
 *
 * @param folderDir - 削除するフォルダのDirectory
 */
export const deleteFolderDirectory = async (folderDir: Directory): Promise<void> => {
  try {
    if (await folderDir.exists) {
      await folderDir.delete();
    }
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to delete folder directory: ${folderDir.uri}`,
      'DELETE_FOLDER_DIR_ERROR',
      e
    );
  }
};

// =============================================================================
// File Operations
// =============================================================================

/**
 * ファイルディレクトリを作成
 *
 * @param parentDir - 親フォルダのDirectory
 * @param fileId - ファイルID（UUID）
 * @param metadata - ファイルメタデータ
 * @param content - ファイルコンテンツ
 */
export const createFileDirectory = async (
  parentDir: Directory,
  fileId: string,
  metadata: FileMetadata,
  content: string
): Promise<void> => {
  try {
    const fileDir = new Directory(parentDir, fileId);

    // ディレクトリ作成
    if (await fileDir.exists) {
      throw new FileSystemV2Error(
        `File directory already exists: ${fileId}`,
        'FILE_ALREADY_EXISTS'
      );
    }

    await fileDir.create();

    // メタデータファイルを作成
    const metadataFile = new FSFile(fileDir, FILE_METADATA_FILENAME);
    await metadataFile.write(JSON.stringify(metadata, null, 2));

    // コンテンツファイルを作成
    const contentFile = new FSFile(fileDir, FILE_CONTENT_FILENAME);
    await contentFile.write(content);
  } catch (e) {
    if (e instanceof FileSystemV2Error) {
      throw e;
    }
    throw new FileSystemV2Error(
      `Failed to create file directory: ${fileId}`,
      'CREATE_FILE_DIR_ERROR',
      e
    );
  }
};

/**
 * ファイルメタデータを読み込み
 *
 * @param fileDir - ファイルのDirectory
 * @returns ファイルメタデータ、存在しない場合はnull
 */
export const readFileMetadata = async (
  fileDir: Directory
): Promise<FileMetadata | null> => {
  try {
    const metadataFile = new FSFile(fileDir, FILE_METADATA_FILENAME);

    if (!(await metadataFile.exists)) {
      return null;
    }

    const content = await metadataFile.text();
    return JSON.parse(content) as FileMetadata;
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to read file metadata: ${fileDir.uri}`,
      'READ_FILE_METADATA_ERROR',
      e
    );
  }
};

/**
 * ファイルコンテンツを読み込み
 *
 * @param fileDir - ファイルのDirectory
 * @returns ファイルコンテンツ
 */
export const readFileContent = async (fileDir: Directory): Promise<string> => {
  try {
    const contentFile = new FSFile(fileDir, FILE_CONTENT_FILENAME);

    if (!(await contentFile.exists)) {
      throw new FileSystemV2Error(
        `File content not found: ${fileDir.uri}`,
        'CONTENT_NOT_FOUND'
      );
    }

    return await contentFile.text();
  } catch (e) {
    if (e instanceof FileSystemV2Error) {
      throw e;
    }
    throw new FileSystemV2Error(
      `Failed to read file content: ${fileDir.uri}`,
      'READ_FILE_CONTENT_ERROR',
      e
    );
  }
};

/**
 * ファイルメタデータを書き込み
 *
 * @param fileDir - ファイルのDirectory
 * @param metadata - ファイルメタデータ
 */
export const writeFileMetadata = async (
  fileDir: Directory,
  metadata: FileMetadata
): Promise<void> => {
  try {
    const metadataFile = new FSFile(fileDir, FILE_METADATA_FILENAME);
    await metadataFile.write(JSON.stringify(metadata, null, 2));
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to write file metadata: ${fileDir.uri}`,
      'WRITE_FILE_METADATA_ERROR',
      e
    );
  }
};

/**
 * ファイルコンテンツを書き込み
 *
 * @param fileDir - ファイルのDirectory
 * @param content - ファイルコンテンツ
 */
export const writeFileContent = async (
  fileDir: Directory,
  content: string
): Promise<void> => {
  try {
    const contentFile = new FSFile(fileDir, FILE_CONTENT_FILENAME);
    await contentFile.write(content);
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to write file content: ${fileDir.uri}`,
      'WRITE_FILE_CONTENT_ERROR',
      e
    );
  }
};

/**
 * ファイルディレクトリを削除
 *
 * @param fileDir - 削除するファイルのDirectory
 */
export const deleteFileDirectory = async (fileDir: Directory): Promise<void> => {
  try {
    if (await fileDir.exists) {
      await fileDir.delete();
    }
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to delete file directory: ${fileDir.uri}`,
      'DELETE_FILE_DIR_ERROR',
      e
    );
  }
};

// =============================================================================
// List Operations
// =============================================================================

/**
 * フォルダ内のファイルをリスト化
 *
 * @param folderDir - フォルダのDirectory
 * @returns ファイルメタデータの配列
 */
export const listFilesInFolder = async (
  folderDir: Directory
): Promise<FileMetadata[]> => {
  try {
    if (!(await folderDir.exists)) {
      return [];
    }

    const items = await folderDir.list();
    const fileMetadataList: FileMetadata[] = [];

    // 各アイテムをチェックして、ファイルディレクトリかどうか判定
    for (const item of items) {
      // Directory型のアイテムのみ処理（ファイルディレクトリはDirectory）
      if (item instanceof Directory) {
        const metadataFile = new FSFile(item, FILE_METADATA_FILENAME);

        // meta.json が存在するならファイルディレクトリ
        if (await metadataFile.exists) {
          const metadata = await readFileMetadata(item);
          if (metadata) {
            fileMetadataList.push(metadata);
          }
        }
      }
    }

    return fileMetadataList;
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to list files in folder: ${folderDir.uri}`,
      'LIST_FILES_ERROR',
      e
    );
  }
};

/**
 * フォルダ内のサブフォルダをリスト化
 *
 * @param folderDir - フォルダのDirectory
 * @returns サブフォルダメタデータの配列
 */
export const listSubfoldersInFolder = async (
  folderDir: Directory
): Promise<FolderMetadata[]> => {
  try {
    if (!(await folderDir.exists)) {
      return [];
    }

    const items = await folderDir.list();
    const folderMetadataList: FolderMetadata[] = [];

    // 各アイテムをチェックして、フォルダディレクトリかどうか判定
    for (const item of items) {
      // Directory型のアイテムのみ処理
      if (item instanceof Directory) {
        const metadataFile = new FSFile(item, FOLDER_METADATA_FILENAME);

        // .folder.json が存在するならフォルダディレクトリ
        if (await metadataFile.exists) {
          const metadata = await readFolderMetadata(item);
          if (metadata) {
            folderMetadataList.push(metadata);
          }
        }
      }
    }

    return folderMetadataList;
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to list subfolders in folder: ${folderDir.uri}`,
      'LIST_SUBFOLDERS_ERROR',
      e
    );
  }
};

// =============================================================================
// Version Operations
// =============================================================================

/**
 * バージョンを保存
 *
 * @param fileId - ファイルID
 * @param versionId - バージョンID
 * @param content - バージョンコンテンツ
 */
export const saveVersion = async (
  fileId: string,
  versionId: string,
  content: string
): Promise<void> => {
  try {
    // versions/{fileId}/ ディレクトリを作成（存在しない場合）
    const fileVersionsDir = new Directory(VERSIONS_DIR, fileId);
    if (!(await fileVersionsDir.exists)) {
      await fileVersionsDir.create();
    }

    // versions/{fileId}/{versionId}.md を作成
    const versionFile = new FSFile(fileVersionsDir, `${versionId}.md`);
    await versionFile.write(content);
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to save version: ${fileId}/${versionId}`,
      'SAVE_VERSION_ERROR',
      e
    );
  }
};

/**
 * バージョンを読み込み
 *
 * @param fileId - ファイルID
 * @param versionId - バージョンID
 * @returns バージョンコンテンツ
 */
export const readVersion = async (
  fileId: string,
  versionId: string
): Promise<string> => {
  try {
    const fileVersionsDir = new Directory(VERSIONS_DIR, fileId);
    const versionFile = new FSFile(fileVersionsDir, `${versionId}.md`);

    if (!(await versionFile.exists)) {
      throw new FileSystemV2Error(
        `Version not found: ${fileId}/${versionId}`,
        'VERSION_NOT_FOUND'
      );
    }

    return await versionFile.text();
  } catch (e) {
    if (e instanceof FileSystemV2Error) {
      throw e;
    }
    throw new FileSystemV2Error(
      `Failed to read version: ${fileId}/${versionId}`,
      'READ_VERSION_ERROR',
      e
    );
  }
};

/**
 * ファイルの全バージョンIDをリスト化
 *
 * @param fileId - ファイルID
 * @returns バージョンIDの配列（ファイル名から.mdを除いたもの）
 */
export const listVersions = async (fileId: string): Promise<string[]> => {
  try {
    const fileVersionsDir = new Directory(VERSIONS_DIR, fileId);

    if (!(await fileVersionsDir.exists)) {
      return [];
    }

    const items = await fileVersionsDir.list();
    const versionIds: string[] = [];

    for (const item of items) {
      // FSFile型のアイテムで、.mdで終わるもののみ処理
      if (item instanceof FSFile) {
        const name = item.uri.split('/').pop() || '';
        if (name.endsWith('.md')) {
          versionIds.push(name.replace(/\.md$/, ''));
        }
      }
    }

    return versionIds;
  } catch (e) {
    throw new FileSystemV2Error(
      `Failed to list versions: ${fileId}`,
      'LIST_VERSIONS_ERROR',
      e
    );
  }
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * ルートディレクトリを取得
 * @returns ルートフォルダのDirectory
 */
export const getRootDirectory = (): Directory => {
  return ROOT_DIR;
};

/**
 * コンテンツベースディレクトリを取得
 * @returns contentディレクトリ
 */
export const getContentDirectory = (): Directory => {
  return CONTENT_DIR;
};
