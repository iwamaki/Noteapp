/**
 * @file treeUtils.ts
 * @summary ツリー構造変換ユーティリティ
 * @responsibility フラットなFileSystemItemをツリー構造（TreeNode）に変換
 */
import { FileSystemItem, Folder, Note } from '../../../../shared/types/note';
import { PathUtils } from './pathUtils';

export interface TreeNode {
  id: string;
  type: 'folder' | 'note';
  item: Folder | Note;
  children: TreeNode[];
  depth: number;
  isExpanded: boolean;
  path: string; // フルパス（フォルダの場合）
}

/**
 * フラットなアイテムリストを階層的なツリー構造に変換
 * @param allFolders すべてのフォルダ
 * @param allNotes すべてのノート
 * @param expandedFolderIds 展開中のフォルダID（Set）
 * @returns ルートレベルのTreeNode配列
 */
export function buildTree(
  allFolders: Folder[],
  allNotes: Note[],
  expandedFolderIds: Set<string>
): TreeNode[] {
  // ルートレベルのアイテムを取得
  const rootItems = getRootItems(allFolders, allNotes);

  // ツリーを構築
  return rootItems.map(item => buildTreeNode(item, allFolders, allNotes, expandedFolderIds, 0));
}

/**
 * ルートレベル（path: '/'）のアイテムを取得
 */
function getRootItems(allFolders: Folder[], allNotes: Note[]): FileSystemItem[] {
  const rootFolders = allFolders
    .filter(f => PathUtils.normalizePath(f.path) === '/')
    .map(f => ({ type: 'folder' as const, item: f }));

  const rootNotes = allNotes
    .filter(n => PathUtils.normalizePath(n.path) === '/')
    .map(n => ({ type: 'note' as const, item: n }));

  return [...rootFolders, ...rootNotes];
}

/**
 * TreeNodeを再帰的に構築
 */
function buildTreeNode(
  item: FileSystemItem,
  allFolders: Folder[],
  allNotes: Note[],
  expandedFolderIds: Set<string>,
  depth: number
): TreeNode {
  if (item.type === 'folder') {
    const folder = item.item;
    const folderPath = PathUtils.getFullPath(folder.path, folder.name);
    const isExpanded = expandedFolderIds.has(folder.id);

    // 子要素を取得（展開中の場合のみ）
    let children: TreeNode[] = [];
    if (isExpanded) {
      const childFolders = allFolders
        .filter(f => PathUtils.normalizePath(f.path) === folderPath)
        .map(f => ({ type: 'folder' as const, item: f }));

      const childNotes = allNotes
        .filter(n => PathUtils.normalizePath(n.path) === folderPath)
        .map(n => ({ type: 'note' as const, item: n }));

      const childItems = [...childFolders, ...childNotes];
      children = childItems.map(child =>
        buildTreeNode(child, allFolders, allNotes, expandedFolderIds, depth + 1)
      );
    }

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
      type: 'note',
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
