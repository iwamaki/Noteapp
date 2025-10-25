/**
 * @file file.ts
 * @summary ファイルに関する型定義
 */

export interface File {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
  path: string; // フォルダパス（例: "/", "/folder1/", "/folder1/subfolder/"）
}

export interface FileVersion {
  id: string;
  fileId: string;
  content: string;
  version: number;
  createdAt: Date;
}

export interface Folder {
  id: string;
  name: string;
  path: string; // 親フォルダのパス
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFileData {
  title: string;
  content: string;
  tags?: string[];
  path?: string; // デフォルトは "/"
}

export interface UpdateFileData {
  id: string;
  title?: string;
  content?: string;
  tags?: string[];
  path?: string; // ファイルの移動に使用
}

export interface CreateFolderData {
  name: string;
  path: string; // 親フォルダのパス
}

export interface UpdateFolderData {
  id: string;
  name?: string;
  path?: string; // フォルダの移動に使用
}

export type FileSystemItem =
  | { type: 'file'; item: File }
  | { type: 'folder'; item: Folder };

// --- FileSystem用のメタデータ型 ---

/**
 * ファイルメタデータ（コンテンツを含まない）
 * FileSystemに保存される際の形式
 */
export interface FileMetadata {
  id: string;
  title: string;
  tags: string[];
  path: string;
  version: number;
  createdAt: string; // ISO string for JSON serialization
  updatedAt: string; // ISO string for JSON serialization
}

/**
 * フォルダメタデータ（FileSystem用）
 */
export interface FolderMetadata {
  id: string;
  name: string;
  path: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/**
 * バージョンメタデータ（コンテンツを含まない）
 */
export interface VersionMetadata {
  id: string;
  fileId: string;
  version: number;
  createdAt: string; // ISO string
}

// --- 変換ヘルパー関数 ---

/**
 * FileオブジェクトをFileMetadataに変換（contentを除外）
 */
export const fileToMetadata = (file: File): FileMetadata => ({
  id: file.id,
  title: file.title,
  tags: file.tags,
  path: file.path,
  version: file.version,
  createdAt: file.createdAt.toISOString(),
  updatedAt: file.updatedAt.toISOString(),
});

/**
 * FileMetadataとcontentからFileオブジェクトを構築
 */
export const metadataToFile = (metadata: FileMetadata, content: string): File => ({
  id: metadata.id,
  title: metadata.title,
  content,
  tags: metadata.tags,
  path: metadata.path,
  version: metadata.version,
  createdAt: new Date(metadata.createdAt),
  updatedAt: new Date(metadata.updatedAt),
});

/**
 * FolderオブジェクトをFolderMetadataに変換
 */
export const folderToMetadata = (folder: Folder): FolderMetadata => ({
  id: folder.id,
  name: folder.name,
  path: folder.path,
  createdAt: folder.createdAt.toISOString(),
  updatedAt: folder.updatedAt.toISOString(),
});

/**
 * FolderMetadataからFolderオブジェクトを構築
 */
export const metadataToFolder = (metadata: FolderMetadata): Folder => ({
  id: metadata.id,
  name: metadata.name,
  path: metadata.path,
  createdAt: new Date(metadata.createdAt),
  updatedAt: new Date(metadata.updatedAt),
});

/**
 * FileVersionオブジェクトをVersionMetadataに変換（contentを除外）
 */
export const versionToMetadata = (version: FileVersion): VersionMetadata => ({
  id: version.id,
  fileId: version.fileId,
  version: version.version,
  createdAt: version.createdAt.toISOString(),
});

/**
 * VersionMetadataとcontentからFileVersionオブジェクトを構築
 */
export const metadataToVersion = (metadata: VersionMetadata, content: string): FileVersion => ({
  id: metadata.id,
  fileId: metadata.fileId,
  content,
  version: metadata.version,
  createdAt: new Date(metadata.createdAt),
});
