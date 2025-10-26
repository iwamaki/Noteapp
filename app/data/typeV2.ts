/**
 * @file typeV2.ts
 * @summary V2型定義 - expo-file-systemの自然な階層構造を活用
 * @description
 * AsyncStorageの名残である`path`フィールドを削除し、
 * ディレクトリ構造がデータ構造を自然に表現する設計。
 *
 * 主な変更点:
 * - File/Folder から path フィールドを削除
 * - Folder に slug フィールドを追加（ディレクトリ名）
 * - メタデータ型を V2 用に刷新
 */

// =============================================================================
// Domain Types (実行時に使用する型)
// =============================================================================

/**
 * フォルダ（V2）
 * - path フィールドを削除: ディレクトリ構造が階層を表現
 * - slug フィールドを追加: ファイルシステム上のディレクトリ名
 */
export interface FolderV2 {
  id: string;
  name: string;           // 表示名（例: "My Folder"）
  slug: string;           // ディレクトリ名（例: "my-folder"、URL-safe）
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ファイル（V2）
 * - path フィールドを削除: 親ディレクトリが階層を表現
 */
export interface FileV2 {
  id: string;
  title: string;
  content: string;        // 実行時のみ保持（保存時は分離）
  tags: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * バージョン（V2）
 * V1から変更なし
 */
export interface FileVersionV2 {
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
 * ファイルメタデータ（V2）
 * {uuid}/meta.json として保存される
 */
export interface FileMetadataV2 {
  id: string;
  title: string;
  tags: string[];
  version: number;
  createdAt: string;      // ISO string for JSON serialization
  updatedAt: string;      // ISO string
}

/**
 * フォルダメタデータ（V2）
 * .folder.json として各ディレクトリに保存される
 */
export interface FolderMetadataV2 {
  id: string;
  name: string;
  slug: string;
  createdAt: string;      // ISO string
  updatedAt: string;      // ISO string
}

/**
 * バージョンメタデータ（V2）
 * V1から変更なし
 */
export interface VersionMetadataV2 {
  id: string;
  fileId: string;
  version: number;
  createdAt: string;      // ISO string
}

// =============================================================================
// Input Data Types (作成・更新用)
// =============================================================================

/**
 * ファイル作成データ（V2）
 */
export interface CreateFileDataV2 {
  title: string;
  content: string;
  tags?: string[];
}

/**
 * ファイル更新データ（V2）
 */
export interface UpdateFileDataV2 {
  title?: string;
  content?: string;
  tags?: string[];
}

/**
 * フォルダ作成データ（V2）
 */
export interface CreateFolderDataV2 {
  name: string;
  // slug は自動生成されるため不要
}

/**
 * フォルダ更新データ（V2）
 */
export interface UpdateFolderDataV2 {
  name?: string;
  // nameを変更するとslugも再生成される
}

// =============================================================================
// Utility Types
// =============================================================================

/**
 * ファイルシステムアイテムの共用体型（V2）
 */
export type FileSystemItemV2 =
  | { type: 'file'; item: FileV2 }
  | { type: 'folder'; item: FolderV2 };

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
 * FileV2 → FileMetadataV2 変換（contentを除外）
 */
export const fileV2ToMetadata = (file: FileV2): FileMetadataV2 => ({
  id: file.id,
  title: file.title,
  tags: file.tags,
  version: file.version,
  createdAt: file.createdAt.toISOString(),
  updatedAt: file.updatedAt.toISOString(),
});

/**
 * FileMetadataV2 + content → FileV2 変換
 */
export const metadataToFileV2 = (metadata: FileMetadataV2, content: string): FileV2 => ({
  id: metadata.id,
  title: metadata.title,
  content,
  tags: metadata.tags,
  version: metadata.version,
  createdAt: new Date(metadata.createdAt),
  updatedAt: new Date(metadata.updatedAt),
});

/**
 * FolderV2 → FolderMetadataV2 変換
 */
export const folderV2ToMetadata = (folder: FolderV2): FolderMetadataV2 => ({
  id: folder.id,
  name: folder.name,
  slug: folder.slug,
  createdAt: folder.createdAt.toISOString(),
  updatedAt: folder.updatedAt.toISOString(),
});

/**
 * FolderMetadataV2 → FolderV2 変換
 */
export const metadataToFolderV2 = (metadata: FolderMetadataV2): FolderV2 => ({
  id: metadata.id,
  name: metadata.name,
  slug: metadata.slug,
  createdAt: new Date(metadata.createdAt),
  updatedAt: new Date(metadata.updatedAt),
});

/**
 * FileVersionV2 → VersionMetadataV2 変換（contentを除外）
 */
export const versionV2ToMetadata = (version: FileVersionV2): VersionMetadataV2 => ({
  id: version.id,
  fileId: version.fileId,
  version: version.version,
  createdAt: version.createdAt.toISOString(),
});

/**
 * VersionMetadataV2 + content → FileVersionV2 変換
 */
export const metadataToVersionV2 = (metadata: VersionMetadataV2, content: string): FileVersionV2 => ({
  id: metadata.id,
  fileId: metadata.fileId,
  content,
  version: metadata.version,
  createdAt: new Date(metadata.createdAt),
});
