/**
 * @file converters.ts
 * @summary Domain型とMetadata型の相互変換関数
 * @description
 * アプリケーション内部で使用するDomain型（Date型含む）と
 * FileSystemに保存するMetadata型（ISO文字列）を相互変換します。
 */

import type {
  File,
  FileMetadata,
  Folder,
  FolderMetadata,
  FileVersion,
  VersionMetadata,
} from './types';

// =============================================================================
// File Converters
// =============================================================================

/**
 * File → FileMetadata 変換（contentを除外）
 *
 * @param file - Domain File型
 * @returns FileMetadata（JSON保存用）
 */
export const fileToMetadata = (file: File): FileMetadata => ({
  id: file.id,
  title: file.title,
  tags: file.tags,
  version: file.version,
  createdAt: file.createdAt.toISOString(),
  updatedAt: file.updatedAt.toISOString(),
});

/**
 * FileMetadata + content → File 変換
 *
 * @param metadata - FileMetadata（JSON形式）
 * @param content - ファイルコンテンツ
 * @returns Domain File型
 */
export const metadataToFile = (metadata: FileMetadata, content: string): File => ({
  id: metadata.id,
  title: metadata.title,
  content,
  tags: metadata.tags,
  version: metadata.version,
  createdAt: new Date(metadata.createdAt),
  updatedAt: new Date(metadata.updatedAt),
});

// =============================================================================
// Folder Converters
// =============================================================================

/**
 * Folder → FolderMetadata 変換
 *
 * @param folder - Domain Folder型
 * @returns FolderMetadata（JSON保存用）
 */
export const folderToMetadata = (folder: Folder): FolderMetadata => ({
  id: folder.id,
  name: folder.name,
  slug: folder.slug,
  createdAt: folder.createdAt.toISOString(),
  updatedAt: folder.updatedAt.toISOString(),
});

/**
 * FolderMetadata → Folder 変換
 *
 * @param metadata - FolderMetadata（JSON形式）
 * @returns Domain Folder型
 */
export const metadataToFolder = (metadata: FolderMetadata): Folder => ({
  id: metadata.id,
  name: metadata.name,
  slug: metadata.slug,
  createdAt: new Date(metadata.createdAt),
  updatedAt: new Date(metadata.updatedAt),
});

// =============================================================================
// Version Converters
// =============================================================================

/**
 * FileVersion → VersionMetadata 変換（contentを除外）
 *
 * @param version - Domain FileVersion型
 * @returns VersionMetadata（JSON保存用）
 */
export const versionToMetadata = (version: FileVersion): VersionMetadata => ({
  id: version.id,
  fileId: version.fileId,
  version: version.version,
  createdAt: version.createdAt.toISOString(),
});

/**
 * VersionMetadata + content → FileVersion 変換
 *
 * @param metadata - VersionMetadata（JSON形式）
 * @param content - バージョンコンテンツ
 * @returns Domain FileVersion型
 */
export const metadataToVersion = (metadata: VersionMetadata, content: string): FileVersion => ({
  id: metadata.id,
  fileId: metadata.fileId,
  content,
  version: metadata.version,
  createdAt: new Date(metadata.createdAt),
});
