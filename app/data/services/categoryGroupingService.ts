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
 * カテゴリーソート方法
 */
export type CategorySortMethod = 'name' | 'fileCount';

/**
 * ファイルソート方法
 */
export type FileSortMethod = 'updatedAt' | 'name';

/**
 * ファイルを階層的なカテゴリー構造でグループ化
 *
 * @param files - グループ化するファイルの配列
 * @param sortMethod - カテゴリーのソート方法（'name': 名前順、'fileCount': ファイル数順）
 * @param fileSortMethod - ファイルのソート方法（'updatedAt': 更新日時順、'name': 名前順）
 * @returns 階層構造を持つカテゴリーセクション配列
 *
 * @example
 * const sections = groupFilesByCategoryHierarchical(files, 'name', 'updatedAt');
 *
 * @remarks
 * - カテゴリー名に "/" を含む場合、階層構造として解釈（例: "研究/AI"）
 * - 親カテゴリーは自動生成（"研究/AI" があれば "研究" も存在）
 * - fileCount は直接属するファイル + 子孫カテゴリーのファイル総数
 * - directFiles は直接そのカテゴリーに属するファイルのみ
 * - カテゴリーソート順:
 *   - sortMethod='name': 名前順（五十音/ABC順）
 *   - sortMethod='fileCount': ファイル数降順
 * - ファイルソート順:
 *   - fileSortMethod='updatedAt': 更新日時の新しい順
 *   - fileSortMethod='name': あいうえお順/アルファベット順
 * - 「未分類」は常に最後
 */
export function groupFilesByCategoryHierarchical(
  files: FileFlat[],
  sortMethod: CategorySortMethod = 'fileCount',
  fileSortMethod: FileSortMethod = 'updatedAt'
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
        // デバッグログ
        console.log(`[FileSort] Category: ${fullPath}, Method: ${fileSortMethod}`);
        if (fullPath === Array.from(categoryNodes.keys())[0] && node.directFileIds.size > 0) {
          console.log(`[FileSort] Sample files: "${a.title}" (${a.updatedAt.toISOString()}) vs "${b.title}" (${b.updatedAt.toISOString()})`);
        }

        if (fileSortMethod === 'name') {
          // 名前順（英数字→ひらがな→カタカナ→漢字）
          // numeric: true で数字を自然順にソート、sensitivity: 'base' で大文字小文字を区別しない
          return a.title.localeCompare(b.title, 'ja', { numeric: true, sensitivity: 'base' });
        } else {
          // 更新日時順（新しい順）
          const result = b.updatedAt.getTime() - a.updatedAt.getTime();
          console.log(`[FileSort] updatedAt comparison result: ${result}`);
          return result;
        }
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
   * - 同じ親を持つカテゴリー同士でソート（sortMethodに応じて）
   * - 親カテゴリーの直後にその子カテゴリーが続く
   */
  const sortedSections: FileCategorySectionHierarchical[] = [];
  const added = new Set<string>();

  // ソート関数を選択
  const sortCategories = (a: FileCategorySectionHierarchical, b: FileCategorySectionHierarchical) => {
    if (sortMethod === 'name') {
      // 名前順（五十音/ABC順）
      return a.category.localeCompare(b.category, 'ja');
    } else {
      // ファイル数降順
      return b.fileCount - a.fileCount;
    }
  };

  const addCategoryAndChildren = (fullPath: string) => {
    if (added.has(fullPath)) return;

    const section = sectionsArray.find(s => s.fullPath === fullPath);
    if (!section) return;

    sortedSections.push(section);
    added.add(fullPath);

    // 子カテゴリーを取得してソート
    const children = sectionsArray
      .filter(s => s.parent === fullPath)
      .sort(sortCategories);

    for (const child of children) {
      addCategoryAndChildren(child.fullPath);
    }
  };

  // ルートカテゴリー（parent === null）から開始
  const rootCategories = sectionsArray
    .filter(s => s.parent === null && s.fullPath !== uncategorizedKey)
    .sort(sortCategories);

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
