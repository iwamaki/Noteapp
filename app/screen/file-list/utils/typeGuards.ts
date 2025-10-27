// app/screen/file-list/utils/typeGuards.ts
import { FileSystemItem, Folder, File } from '@data/types';
import { TreeNode } from './treeUtils';

/**
 * 型ガード関数集
 */

export function isFolder(item: FileSystemItem): item is { type: 'folder'; item: Folder } {
  return item.type === 'folder';
}

export function isFile(item: FileSystemItem): item is { type: 'file'; item: File } {
  return item.type === 'file';
}

export function isFolderNode(node: TreeNode): node is TreeNode & { type: 'folder'; item: Folder } {
  return node.type === 'folder';
}

export function isFileNode(node: TreeNode): node is TreeNode & { type: 'file'; item: File } {
  return node.type === 'file';
}

/**
 * FileSystemItemからFolderを安全に取得
 */
export function getFolder(item: FileSystemItem): Folder | null {
  return isFolder(item) ? item.item : null;
}

/**
 * FileSystemItemからFileを安全に取得
 */
export function getFile(item: FileSystemItem): File | null {
  return isFile(item) ? item.item : null;
}

/**
 * TreeNodeからFolderを安全に取得
 */
export function getFolderFromNode(node: TreeNode): Folder | null {
  return isFolderNode(node) ? node.item : null;
}

/**
 * TreeNodeからFileを安全に取得
 */
export function getFileFromNode(node: TreeNode): File | null {
  return isFileNode(node) ? node.item : null;
}

/**
 * 複数のFileSystemItemから特定の型のみを抽出
 */
export function extractFolders(items: FileSystemItem[]): Folder[] {
  return items.filter(isFolder).map(item => item.item);
}

export function extractFiles(items: FileSystemItem[]): File[] {
  return items.filter(isFile).map(item => item.item);
}