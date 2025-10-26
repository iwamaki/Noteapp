/**
 * @file treeUtils.ts
 * @summary ツリー構造変換ユーティリティ
 * @responsibility フラットなFileSystemItemをツリー構造（TreeNode）に変換
 *
 * Note: V2への移行中。V1型（Folder, File）を使用しているため、
 * 一時的なヘルパー関数を使用してパス操作を行います。
 */
import { FileSystemItem, Folder, File } from '@data/type';
import { PathServiceV2 } from '../../../services/PathServiceV2';
import { logger } from '../../../utils/logger';

/**
 * V1型用のヘルパー関数：フォルダのフルパスを取得
 * V2型への移行後は不要になります
 */
function getFullPathV1(parentPath: string, name: string): string {
  const normalized = PathServiceV2.normalizePath(parentPath);
  if (normalized === '/') {
    return `/${name}/`;
  }
  return `/${normalized}/${name}/`;
}

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
  logger.debug('tree', '🌲 buildTree: Starting.', { totalFolders: allFolders.length, totalFiles: allFiles.length });
  if (__DEV__) {
    logger.debug('tree', '🌲 Building tree from storage:', {
      totalFolders: allFolders.length,
      totalFiles: allFiles.length,
      expandedFolders: expandedFolderIds.size,
    });
  }

  // ルートレベルのアイテムを取得
  const rootItems = getRootItems(allFolders, allFiles);
  logger.debug('tree', `🌲 buildTree: Found ${rootItems.length} root items.`);

  // ツリーを構築
  const tree = rootItems.map(item => buildTreeNode(item, allFolders, allFiles, expandedFolderIds, 0));

  if (__DEV__) {
    logger.debug('tree', `🌲 Tree built: ${tree.length} root items`);
  }
  logger.debug('tree', '🌲 buildTree: Finished.');
  return tree;
}

/**
 * ルートレベル（path: '/'）のアイテムを取得
 */
function getRootItems(allFolders: Folder[], allFiles: File[]): FileSystemItem[] {
  const rootFolders = allFolders
    .filter(f => PathServiceV2.normalizePath(f.path) === '/')
    .map(f => ({ type: 'folder' as const, item: f }));

  const rootFiles = allFiles
    .filter(n => PathServiceV2.normalizePath(n.path) === '/')
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
    const folderPath = getFullPathV1(folder.path, folder.name);
    const isExpanded = expandedFolderIds.has(folder.id);


    const childFolders = allFolders
      .filter(f => PathServiceV2.normalizePath(f.path) === folderPath)
      .map(f => ({ type: 'folder' as const, item: f }));

    const childFiles = allFiles
      .filter(n => PathServiceV2.normalizePath(n.path) === folderPath)
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
  logger.debug('tree', '🌳 flattenTree: Starting.', { treeLength: tree.length });
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
  logger.debug('tree', `🌳 flattenTree: Finished. Flattened to ${result.length} items.`);
  return result;
}
