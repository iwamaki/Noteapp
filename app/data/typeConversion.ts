/**
 * @file typeConversion.ts
 * @summary V1型とV2型の相互変換ユーティリティ
 * @description
 * V1からV2への移行期間中、互換性レイヤーとして機能します。
 * 将来的にV1が完全に削除されたら、このファイルも削除されます。
 */

import { File, Folder } from './type';
import { FileV2, FolderV2 } from './typeV2';

/**
 * FolderV2からV1 Folderに変換
 * V2にはpathフィールドがないため、親パスを明示的に渡す必要があります
 */
export function folderV2ToV1(folderV2: FolderV2, parentPath: string = '/'): Folder {
  return {
    id: folderV2.id,
    name: folderV2.name,
    path: parentPath,
    createdAt: folderV2.createdAt,
    updatedAt: folderV2.updatedAt,
  };
}

/**
 * FileV2からV1 Fileに変換
 * V2にはpathフィールドがないため、親パスを明示的に渡す必要があります
 */
export function fileV2ToV1(fileV2: FileV2, parentPath: string = '/'): File {
  return {
    id: fileV2.id,
    title: fileV2.title,
    content: fileV2.content,
    path: parentPath,
    tags: fileV2.tags,
    version: fileV2.version,
    createdAt: fileV2.createdAt,
    updatedAt: fileV2.updatedAt,
  };
}

/**
 * V1 FolderからFolderV2に変換
 * pathフィールドは削除され、slugが生成されます
 */
export function folderV1ToV2(folder: Folder): FolderV2 {
  return {
    id: folder.id,
    name: folder.name,
    slug: generateSlugFromName(folder.name),
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

/**
 * V1 FileからFileV2に変換
 * pathフィールドは削除されます
 */
export function fileV1ToV2(file: File): FileV2 {
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
