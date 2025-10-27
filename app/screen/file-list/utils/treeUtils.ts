/**
 * @file treeUtils.ts
 * @summary ツリー構造変換ユーティリティ
 * @responsibility フラットなFileSystemItemをツリー構造（TreeNode）に変換
 *
 * V2型に対応。pathフィールドは使用せず、slug-based階層構造を使用します。
 */
import { FileSystemItem, Folder, File } from '@data/types';
import { logger } from '../../../utils/logger';


export interface TreeNode {
  id: string;
  type: 'folder' | 'file';
  item: Folder | File;
  children: TreeNode[];
  depth: number;
  isExpanded: boolean;
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
 * ルートレベルのアイテムを取得
 * V2型では、FileListProviderから渡されるfoldersとfilesはすでに
 * 特定のパスのアイテムなので、そのまま使用します
 */
function getRootItems(allFolders: Folder[], allFiles: File[]): FileSystemItem[] {
  const rootFolders = allFolders.map(f => ({ type: 'folder' as const, item: f }));
  const rootFiles = allFiles.map(n => ({ type: 'file' as const, item: n }));

  return [...rootFolders, ...rootFiles];
}

/**
 * TreeNodeを構築
 * V2型では階層構造はFileSystemで管理されているため、
 * 渡されたアイテムをそのままTreeNodeに変換します（子の再帰検索なし）
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
    const isExpanded = expandedFolderIds.has(folder.id);

    // V2型では、子アイテムはFileListProviderから
    // 明示的に取得する必要があるため、ここでは空配列
    const children: TreeNode[] = [];

    return {
      id: folder.id,
      type: 'folder',
      item: folder,
      children,
      depth,
      isExpanded,
    };
  } else {
    // ファイル
    return {
      id: item.item.id,
      type: 'file',
      item: item.item,
      children: [],
      depth,
      isExpanded: false,
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
