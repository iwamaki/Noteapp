/**
 * @file treeUtils.ts
 * @summary ツリー構造変換ユーティリティ
 * @responsibility フラットなFileSystemItemをツリー構造（TreeNode）に変換
 *
 * V2型に対応。pathフィールドは使用せず、slug-based階層構造を使用します。
 */
import { FileSystemItem, Folder, File } from '@data/core/types';
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
 * @param folderPaths フォルダID → 仮想パスのマップ
 * @param filePaths ファイルID → 親フォルダパスのマップ
 * @returns ルートレベルのTreeNode配列
 */
export function buildTree(
  allFolders: Folder[],
  allFiles: File[],
  expandedFolderIds: Set<string>,
  folderPaths: Map<string, string>,
  filePaths: Map<string, string>
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
  const rootItems = getRootItems(allFolders, allFiles, folderPaths, filePaths);
  logger.debug('tree', `🌲 buildTree: Found ${rootItems.length} root items.`);

  // ツリーを構築
  const tree = rootItems.map(item => buildTreeNode(item, allFolders, allFiles, expandedFolderIds, folderPaths, filePaths, 0));

  if (__DEV__) {
    logger.debug('tree', `🌲 Tree built: ${tree.length} root items`);
  }
  logger.debug('tree', '🌲 buildTree: Finished.');
  return tree;
}

/**
 * ルートレベルのアイテムを取得
 * パス情報を使って、ルートパス ('/') に属するアイテムのみをフィルタリング
 */
function getRootItems(
  allFolders: Folder[],
  allFiles: File[],
  folderPaths: Map<string, string>,
  filePaths: Map<string, string>
): FileSystemItem[] {
  // ルートパス "/" に属するフォルダをフィルタ
  const rootFolders = allFolders
    .filter(f => {
      const path = folderPaths.get(f.id);
      // ルートフォルダは /slug/ の形式（スラッシュが2つ）
      return path && path.split('/').filter(Boolean).length === 1;
    })
    .map(f => ({ type: 'folder' as const, item: f }));

  // ルートパス "/" に属するファイルをフィルタ
  const rootFiles = allFiles
    .filter(f => {
      const path = filePaths.get(f.id);
      return path === '/';
    })
    .map(n => ({ type: 'file' as const, item: n }));

  return [...rootFolders, ...rootFiles];
}

/**
 * TreeNodeを構築
 * パス情報を使って親子関係を解決し、階層的なツリーを構築
 */
function buildTreeNode(
  item: FileSystemItem,
  allFolders: Folder[],
  allFiles: File[],
  expandedFolderIds: Set<string>,
  folderPaths: Map<string, string>,
  filePaths: Map<string, string>,
  depth: number
): TreeNode {
  if (item.type === 'folder') {
    const folder = item.item;
    const isExpanded = expandedFolderIds.has(folder.id);
    const folderPath = folderPaths.get(folder.id) || '/';

    // このフォルダの子アイテムを取得
    const children: TreeNode[] = [];

    if (isExpanded) {
      // 子フォルダを検索（このフォルダのパスを親として持つフォルダ）
      const childFolders = allFolders
        .filter(f => {
          const childPath = folderPaths.get(f.id);
          if (!childPath) return false;

          // 子フォルダのパスは親フォルダパス + slug + / の形式
          // 例: 親が /parent/ なら、子は /parent/child/
          // 子のパスから最後のslugを除去すると親のパスになるはず
          const parts = childPath.split('/').filter(Boolean);
          if (parts.length === 0) return false;

          const parentPath = parts.length === 1
            ? '/'
            : `/${parts.slice(0, -1).join('/')}/`;

          return parentPath === folderPath;
        })
        .map(f => ({ type: 'folder' as const, item: f }));

      // 子ファイルを検索（このフォルダのパスを親パスとして持つファイル）
      const childFiles = allFiles
        .filter(f => filePaths.get(f.id) === folderPath)
        .map(f => ({ type: 'file' as const, item: f }));

      // 子ノードを再帰的に構築
      const childItems = [...childFolders, ...childFiles];
      children.push(
        ...childItems.map(child =>
          buildTreeNode(child, allFolders, allFiles, expandedFolderIds, folderPaths, filePaths, depth + 1)
        )
      );
    }

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
