/**
 * @file categoryGroupingService.ts
 * @summary カテゴリーグルーピングサービス
 * @description
 * ファイルを階層的なカテゴリー構造でグループ化する純粋関数を提供。
 * MetadataService の groupFilesByCategoryHierarchical の同期版。
 */

import { FileFlat, FileCategorySectionHierarchical } from '../core/typesFlat';

/**
 * カテゴリーノード（内部使用）
 */
interface CategoryNode {
  fullPath: string;
  level: number;
  parent: string | null;
  directFileIds: Set<string>;
  childPaths: Set<string>;
}

/**
 * ファイルを階層的なカテゴリー構造でグループ化
 *
 * @param files - グループ化するファイルの配列
 * @returns 階層構造を持つカテゴリーセクション配列
 *
 * @example
 * const sections = groupFilesByCategoryHierarchical(files);
 *
 * @remarks
 * - カテゴリー名に "/" を含む場合、階層構造として解釈（例: "研究/AI"）
 * - 親カテゴリーは自動生成（"研究/AI" があれば "研究" も存在）
 * - fileCount は直接属するファイル + 子孫カテゴリーのファイル総数
 * - directFiles は直接そのカテゴリーに属するファイルのみ
 * - ソート順: 親カテゴリー → サブカテゴリー（各階層内でfileCount降順）
 * - 「未分類」は常に最後
 */
export function groupFilesByCategoryHierarchical(
  files: FileFlat[]
): FileCategorySectionHierarchical[] {
  const uncategorizedKey = '未分類';
  const categoryNodes = new Map<string, CategoryNode>();

  /**
   * カテゴリーノードを作成（親カテゴリーも自動生成）
   */
  const ensureCategoryNode = (fullPath: string) => {
    if (categoryNodes.has(fullPath)) return;

    const parts = fullPath.split('/');
    const level = parts.length - 1;
    const parent = level > 0 ? parts.slice(0, -1).join('/') : null;

    categoryNodes.set(fullPath, {
      fullPath,
      level,
      parent,
      directFileIds: new Set(),
      childPaths: new Set(),
    });

    // 親カテゴリーも再帰的に作成
    if (parent) {
      ensureCategoryNode(parent);
      const parentNode = categoryNodes.get(parent)!;
      parentNode.childPaths.add(fullPath);
    }
  };

  /**
   * ファイルをカテゴリーに振り分け
   */
  const fileMap = new Map<string, FileFlat>();
  for (const file of files) {
    fileMap.set(file.id, file);
    const category = file.category || uncategorizedKey;
    ensureCategoryNode(category);
    categoryNodes.get(category)!.directFileIds.add(file.id);
  }

  /**
   * 各カテゴリーの総ファイル数を計算（子孫も含む）
   */
  const calculateTotalFileCount = (fullPath: string): number => {
    const node = categoryNodes.get(fullPath);
    if (!node) return 0;

    let total = node.directFileIds.size;
    for (const childPath of node.childPaths) {
      total += calculateTotalFileCount(childPath);
    }
    return total;
  };

  /**
   * FileCategorySectionHierarchical配列に変換
   */
  const sectionsArray: FileCategorySectionHierarchical[] = [];

  for (const [fullPath, node] of categoryNodes.entries()) {
    const parts = fullPath.split('/');
    const category = parts[parts.length - 1];
    const fileCount = calculateTotalFileCount(fullPath);
    const directFiles = Array.from(node.directFileIds)
      .map(id => fileMap.get(id)!)
      .filter(Boolean)
      .sort((a, b) => {
        // orderフィールドが存在する場合はorder順にソート
        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) {
          return orderA - orderB;
        }
        // orderが同じ場合は更新日時の新しい順
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });

    sectionsArray.push({
      category,
      fullPath,
      level: node.level,
      parent: node.parent,
      fileCount,
      directFiles,
    });
  }

  /**
   * ソート処理
   * - 未分類は最後
   * - 同じ親を持つカテゴリー同士でfileCount降順
   * - 親カテゴリーの直後にその子カテゴリーが続く
   */
  const sortedSections: FileCategorySectionHierarchical[] = [];
  const added = new Set<string>();

  const addCategoryAndChildren = (fullPath: string) => {
    if (added.has(fullPath)) return;

    const section = sectionsArray.find(s => s.fullPath === fullPath);
    if (!section) return;

    sortedSections.push(section);
    added.add(fullPath);

    // 子カテゴリーを取得してソート（fileCount降順）
    const children = sectionsArray
      .filter(s => s.parent === fullPath)
      .sort((a, b) => b.fileCount - a.fileCount);

    for (const child of children) {
      addCategoryAndChildren(child.fullPath);
    }
  };

  // ルートカテゴリー（parent === null）から開始
  const rootCategories = sectionsArray
    .filter(s => s.parent === null && s.fullPath !== uncategorizedKey)
    .sort((a, b) => b.fileCount - a.fileCount);

  for (const root of rootCategories) {
    addCategoryAndChildren(root.fullPath);
  }

  // 未分類を最後に追加
  const uncategorizedSection = sectionsArray.find(s => s.fullPath === uncategorizedKey);
  if (uncategorizedSection) {
    sortedSections.push(uncategorizedSection);
  }

  return sortedSections;
}
