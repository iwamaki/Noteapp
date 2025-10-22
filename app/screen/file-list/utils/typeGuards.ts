// app/screen/file-list/utils/typeGuards.ts
import { FileSystemItem, Folder, File } from '@shared/types/file';
import { TreeNode } from './treeUtils';

/**
 * 型ガード関数集
 */

export function isFolder(item: FileSystemItem): item is { type: 'folder'; item: Folder } {
  return item.type === 'folder';
}

export function isNote(item: FileSystemItem): item is { type: 'file'; item: File } {
  return item.type === 'file';
}

export function isFolderNode(node: TreeNode): node is TreeNode & { type: 'folder'; item: Folder } {
  return node.type === 'folder';
}

export function isNoteNode(node: TreeNode): node is TreeNode & { type: 'file'; item: File } {
  return node.type === 'file';
}

/**
 * FileSystemItemからFolderを安全に取得
 */
export function getFolder(item: FileSystemItem): Folder | null {
  return isFolder(item) ? item.item : null;
}

/**
 * FileSystemItemからNoteを安全に取得
 */
export function getNote(item: FileSystemItem): File | null {
  return isNote(item) ? item.item : null;
}

/**
 * TreeNodeからFolderを安全に取得
 */
export function getFolderFromNode(node: TreeNode): Folder | null {
  return isFolderNode(node) ? node.item : null;
}

/**
 * TreeNodeからNoteを安全に取得
 */
export function getNoteFromNode(node: TreeNode): File | null {
  return isNoteNode(node) ? node.item : null;
}

/**
 * 複数のFileSystemItemから特定の型のみを抽出
 */
export function extractFolders(items: FileSystemItem[]): Folder[] {
  return items.filter(isFolder).map(item => item.item);
}

export function extractNotes(items: FileSystemItem[]): File[] {
  return items.filter(isNote).map(item => item.item);
}