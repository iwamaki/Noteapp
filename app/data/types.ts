/**
 * @file types.ts
 * @summary 型定義 - expo-file-systemの自然な階層構造を活用
 * @description
 * ディレクトリ構造がデータ構造を自然に表現する設計。
 *
 * 主な特徴:
 * - File/Folder に path フィールドなし（ディレクトリ構造が階層を表現）
 * - Folder に slug フィールド（ディレクトリ名）
 * - メタデータとコンテンツを分離
 */

// =============================================================================
// Domain Types (実行時に使用する型)
// =============================================================================

/**
 * フォルダ
 * - ディレクトリ構造が階層を表現
 * - slug フィールド: ファイルシステム上のディレクトリ名
 */
export interface Folder {
  id: string;
  name: string;           // 表示名（例: "My Folder"）
  slug: string;           // ディレクトリ名（例: "my-folder"、URL-safe）
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ファイル
 * - 親ディレクトリが階層を表現
 */
export interface File {
  id: string;
  title: string;
  content: string;        // 実行時のみ保持（保存時は分離）
  tags: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * バージョン
 */
export interface FileVersion {
  id: string;
  fileId: string;
  content: string;
  version: number;
  createdAt: Date;
}

// =============================================================================
// Metadata Types (FileSystemに保存する形式)
// =============================================================================

/**
 * ファイルメタデータ
 * {uuid}/meta.json として保存される
 */
export interface FileMetadata {
  id: string;
  title: string;
  tags: string[];
  version: number;
  createdAt: string;      // ISO string for JSON serialization
  updatedAt: string;      // ISO string
}

/**
 * フォルダメタデータ
 * .folder.json として各ディレクトリに保存される
 */
export interface FolderMetadata {
  id: string;
  name: string;
  slug: string;
  createdAt: string;      // ISO string
  updatedAt: string;      // ISO string
}

/**
 * バージョンメタデータ
 */
export interface VersionMetadata {
  id: string;
  fileId: string;
  version: number;
  createdAt: string;      // ISO string
}

// =============================================================================
// Input Data Types (作成・更新用)
// =============================================================================

/**
 * ファイル作成データ
 */
export interface CreateFileData {
  title: string;
  content: string;
  tags?: string[];
}

/**
 * ファイル更新データ
 */
export interface UpdateFileData {
  title?: string;
  content?: string;
  tags?: string[];
}

/**
 * フォルダ作成データ
 */
export interface CreateFolderData {
  name: string;
  // slug は自動生成されるため不要
}

/**
 * フォルダ更新データ
 */
export interface UpdateFolderData {
  name?: string;
  // nameを変更するとslugも再生成される
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * ファイルシステムアイテムの共用体型
 */
export type FileSystemItem =
  | { type: 'file'; item: File }
  | { type: 'folder'; item: Folder };

// =============================================================================
// Slug Generation Utility
// =============================================================================

/**
 * フォルダ名からslugを生成
 *
 * @param name - フォルダ名（例: "My Folder 1"）
 * @returns URL-safeなslug（例: "my-folder-1"）
 *
 * @example
 * generateSlug("My Folder") // => "my-folder"
 * generateSlug("Folder 1") // => "folder-1"
 * generateSlug("Test@#$Folder") // => "test-folder"
 *
 * @remarks
 * - 英数字以外は "-" に置換される
 * - 日本語などの非ASCII文字も "-" になる
 * - 空のslugになる場合は、呼び出し側で適切な処理が必要
 * - 重複チェックは呼び出し側で実施すること
 */
export const generateSlug = (name: string): string => {
  if (!name) return '';

  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // 英数字以外をハイフンに
    .replace(/^-+|-+$/g, '');      // 前後のハイフンを削除
};

// =============================================================================
// Conversion Functions (Domain ⇔ Metadata)
// =============================================================================

/**
 * File → FileMetadata 変換（contentを除外）
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

/**
 * Folder → FolderMetadata 変換
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
 */
export const metadataToFolder = (metadata: FolderMetadata): Folder => ({
  id: metadata.id,
  name: metadata.name,
  slug: metadata.slug,
  createdAt: new Date(metadata.createdAt),
  updatedAt: new Date(metadata.updatedAt),
});

/**
 * FileVersion → VersionMetadata 変換（contentを除外）
 */
export const versionToMetadata = (version: FileVersion): VersionMetadata => ({
  id: version.id,
  fileId: version.fileId,
  version: version.version,
  createdAt: version.createdAt.toISOString(),
});

/**
 * VersionMetadata + content → FileVersion 変換
 */
export const metadataToVersion = (metadata: VersionMetadata, content: string): FileVersion => ({
  id: metadata.id,
  fileId: metadata.fileId,
  content,
  version: metadata.version,
  createdAt: new Date(metadata.createdAt),
});
