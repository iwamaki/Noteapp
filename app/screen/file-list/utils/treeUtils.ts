/**
 * @file treeUtils.ts
 * @summary ツリー構造変換ユーティリティ
 * @responsibility フラットなFileSystemItemをツリー構造（TreeNode）に変換
 */
import { FileSystemItem, Folder, File } from '../../../../shared/types/file';
import { PathService } from '../../../services/PathService';
import { logger } from '../../../utils/logger';

export interface TreeNode {
  id: string;
  type: 'folder' | 'file';
  item: Folder | File;
  children: TreeNode[];
  depth: number;
  isExpanded: boolean;
  path: string; // フルパス（フォルダの場合）
}

/**
 * フラットなアイテムリストを階層的なツリー構造に変換
 * @param allFolders すべてのフォルダ
 * @param allFiles すべてのノート
 * @param expandedFolderIds 展開中のフォルダID（Set）
 * @returns ルートレベルのTreeNode配列
 */
export function buildTree(
  allFolders: Folder[],
  allFiles: File[],
  expandedFolderIds: Set<string>
): TreeNode[] {
  if (__DEV__) {
    logger.debug('tree', '🌲 Building tree from storage:', {
      totalFolders: allFolders.length,
      totalFiles: allFiles.length,
      expandedFolders: expandedFolderIds.size,
    });
  }

  // ルートレベルのアイテムを取得
  const rootItems = getRootItems(allFolders, allFiles);

  // ツリーを構築
  const tree = rootItems.map(item => buildTreeNode(item, allFolders, allFiles, expandedFolderIds, 0));

  if (__DEV__) {
    logger.debug('tree', `🌲 Tree built: ${tree.length} root items`);
  }

  return tree;
}

/**
 * ルートレベル（path: '/'）のアイテムを取得
 */
function getRootItems(allFolders: Folder[], allFiles: File[]): FileSystemItem[] {
  const rootFolders = allFolders
    .filter(f => PathService.normalizePath(f.path) === '/')
    .map(f => ({ type: 'folder' as const, item: f }));

  const rootFiles = allFiles
    .filter(n => PathService.normalizePath(n.path) === '/')
    .map(n => ({ type: 'file' as const, item: n }));

  return [...rootFolders, ...rootFiles];
}

/**
 * TreeNodeを再帰的に構築
 */
function buildTreeNode(
  item: FileSystemItem,
  allFolders: Folder[],
  allFiles: File[],
  expandedFolderIds: Set<string>,
  depth: number
): TreeNode {
  if (item.type === 'folder') {
    const folder = item.item;
    const folderPath = PathService.getFullPath(folder.path, folder.name, 'folder');
    const isExpanded = expandedFolderIds.has(folder.id);


    const childFolders = allFolders
      .filter(f => PathService.normalizePath(f.path) === folderPath)
      .map(f => ({ type: 'folder' as const, item: f }));

    const childFiles = allFiles
      .filter(n => PathService.normalizePath(n.path) === folderPath)
      .map(n => ({ type: 'file' as const, item: n }));

    const childItems = [...childFolders, ...childFiles];
    const children = childItems.map(child =>
      buildTreeNode(child, allFolders, allFiles, expandedFolderIds, depth + 1)
    );

    return {
      id: folder.id,
      type: 'folder',
      item: folder,
      children,
      depth,
      isExpanded,
      path: folderPath,
    };
  } else {
    // ノート
    return {
      id: item.item.id,
      type: 'file',
      item: item.item,
      children: [],
      depth,
      isExpanded: false,
      path: item.item.path,
    };
  }
}

/**
 * ツリー構造をフラットなリストに変換（表示用）
 * @param tree ツリーのルートノード配列
 * @returns フラット化されたTreeNode配列
 */
export function flattenTree(tree: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];

  function traverse(nodes: TreeNode[]) {
    for (const node of nodes) {
      result.push(node);
      if (node.isExpanded && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);
  return result;
}
