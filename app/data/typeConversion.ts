/**
 * @file typeConversion.ts
 * @summary V1型とV2型の相互変換ユーティリティ
 * @description
 * V1からV2への移行期間中、互換性レイヤーとして機能します。
 * 将来的にV1が完全に削除されたら、このファイルも削除されます。
 */

import { File as FileV1, Folder as FolderV1 } from './typeV1';
import { File, Folder } from './types';

/**
 * 新型（slug-based）から旧V1型（path-based）に変換
 * 旧型にはpathフィールドがあるため、親パスを明示的に渡す必要があります
 */
export function folderV2ToV1(folder: Folder, parentPath: string = '/'): FolderV1 {
  return {
    id: folder.id,
    name: folder.name,
    path: parentPath,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

/**
 * 新型（slug-based）から旧V1型（path-based）に変換
 * 旧型にはpathフィールドがあるため、親パスを明示的に渡す必要があります
 */
export function fileV2ToV1(file: File, parentPath: string = '/'): FileV1 {
  return {
    id: file.id,
    title: file.title,
    content: file.content,
    path: parentPath,
    tags: file.tags,
    version: file.version,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

/**
 * 旧V1型（path-based）から新型（slug-based）に変換
 * pathフィールドは削除され、slugが生成されます
 */
export function folderV1ToV2(folder: FolderV1): Folder {
  return {
    id: folder.id,
    name: folder.name,
    slug: generateSlugFromName(folder.name),
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

/**
 * 旧V1型（path-based）から新型（slug-based）に変換
 * pathフィールドは削除されます
 */
export function fileV1ToV2(file: FileV1): File {
  return {
    id: file.id,
    title: file.title,
    content: file.content,
    tags: file.tags,
    version: file.version,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

/**
 * 名前からslugを生成
 */
function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
