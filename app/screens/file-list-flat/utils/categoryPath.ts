/**
 * @file categoryPath.ts
 * @summary カテゴリーパス操作のユーティリティ関数
 * @description
 * カテゴリーパスの分割、結合、フィルタリングなどの操作を提供。
 * 階層構造を持つカテゴリーの管理を簡素化。
 */

import { FileFlat } from '@data/core/typesFlat';

/**
 * カテゴリーパスの区切り文字
 */
export const CATEGORY_SEPARATOR = '/';

/**
 * カテゴリーパスを分割
 *
 * カテゴリーパス文字列をスラッシュで分割し、
 * 各階層の名前を配列で返します。
 *
 * @param categoryPath - カテゴリーパス（例: "研究/AI/機械学習"）
 * @returns 各階層の名前の配列（例: ["研究", "AI", "機械学習"]）
 *
 * @example
 * splitCategoryPath('研究/AI/機械学習') // => ['研究', 'AI', '機械学習']
 * splitCategoryPath('') // => []
 * splitCategoryPath('単一カテゴリー') // => ['単一カテゴリー']
 */
export function splitCategoryPath(categoryPath: string): string[] {
  if (!categoryPath || categoryPath.trim() === '') {
    return [];
  }
  return categoryPath.split(CATEGORY_SEPARATOR).filter((part) => part.trim() !== '');
}

/**
 * フルパスから最後のカテゴリー名を取得
 *
 * 階層的なカテゴリーパスから、最も深い階層（最後）の
 * カテゴリー名を取得します。
 *
 * @param categoryPath - カテゴリーパス（例: "研究/AI/機械学習"）
 * @returns 最後のカテゴリー名（例: "機械学習"）
 *
 * @example
 * getCategoryNameFromPath('研究/AI/機械学習') // => '機械学習'
 * getCategoryNameFromPath('単一カテゴリー') // => '単一カテゴリー'
 * getCategoryNameFromPath('') // => ''
 */
export function getCategoryNameFromPath(categoryPath: string): string {
  const parts = splitCategoryPath(categoryPath);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}

/**
 * 親カテゴリーのパスを取得
 *
 * 指定されたカテゴリーパスの親（1つ上の階層）のパスを返します。
 * ルートカテゴリーの場合は空文字列を返します。
 *
 * @param categoryPath - カテゴリーパス（例: "研究/AI/機械学習"）
 * @returns 親カテゴリーのパス（例: "研究/AI"）
 *
 * @example
 * getParentCategoryPath('研究/AI/機械学習') // => '研究/AI'
 * getParentCategoryPath('研究') // => ''
 * getParentCategoryPath('') // => ''
 */
export function getParentCategoryPath(categoryPath: string): string {
  const parts = splitCategoryPath(categoryPath);
  if (parts.length <= 1) {
    return '';
  }
  return parts.slice(0, -1).join(CATEGORY_SEPARATOR);
}

/**
 * カテゴリーパスを結合
 *
 * 複数のカテゴリー名を結合して、階層的なパスを生成します。
 *
 * @param parts - カテゴリー名の配列
 * @returns 結合されたカテゴリーパス
 *
 * @example
 * joinCategoryPath(['研究', 'AI', '機械学習']) // => '研究/AI/機械学習'
 * joinCategoryPath(['単一']) // => '単一'
 * joinCategoryPath([]) // => ''
 */
export function joinCategoryPath(parts: string[]): string {
  return parts.filter((part) => part.trim() !== '').join(CATEGORY_SEPARATOR);
}

/**
 * 指定されたカテゴリーとそのサブカテゴリーに属するファイルをフィルタリング
 *
 * カテゴリーパスが完全一致、または指定されたカテゴリーで始まる
 * （サブカテゴリーを含む）ファイルをフィルタリングします。
 *
 * @param files - 全ファイルの配列
 * @param categoryPath - フィルタリングするカテゴリーパス
 * @returns フィルタリングされたファイルの配列
 *
 * @example
 * const files = [
 *   { category: '研究/AI', ... },
 *   { category: '研究/AI/ML', ... },
 *   { category: '個人メモ', ... },
 * ];
 * filterFilesByCategory(files, '研究/AI')
 * // => [{ category: '研究/AI', ... }, { category: '研究/AI/ML', ... }]
 *
 * @remarks
 * - カテゴリーが完全一致する場合も含む
 * - サブカテゴリー（`category + '/'` で始まる）も含む
 * - 空のカテゴリーパスを指定すると、カテゴリーが空または未定義のファイルを返す
 */
export function filterFilesByCategory(files: FileFlat[], categoryPath: string): FileFlat[] {
  // 空のカテゴリーパスの場合、カテゴリーが空または未定義のファイルを返す
  if (!categoryPath || categoryPath.trim() === '') {
    return files.filter((file) => !file.category || file.category.trim() === '');
  }

  return files.filter((file) => {
    // カテゴリーが完全一致、または指定されたカテゴリーで始まる（サブカテゴリーを含む）
    return (
      file.category === categoryPath ||
      file.category.startsWith(categoryPath + CATEGORY_SEPARATOR)
    );
  });
}

/**
 * カテゴリーが別のカテゴリーのサブカテゴリーかどうかを判定
 *
 * @param childPath - 子カテゴリーのパス
 * @param parentPath - 親カテゴリーのパス
 * @returns サブカテゴリーの場合true
 *
 * @example
 * isSubCategoryOf('研究/AI/ML', '研究/AI') // => true
 * isSubCategoryOf('研究/AI', '研究/AI') // => false (完全一致)
 * isSubCategoryOf('研究', '研究/AI') // => false
 */
export function isSubCategoryOf(childPath: string, parentPath: string): boolean {
  if (!childPath || !parentPath) {
    return false;
  }

  // 完全一致の場合はfalse（サブカテゴリーではない）
  if (childPath === parentPath) {
    return false;
  }

  return childPath.startsWith(parentPath + CATEGORY_SEPARATOR);
}

/**
 * カテゴリー階層の深さを取得
 *
 * @param categoryPath - カテゴリーパス
 * @returns 階層の深さ（0はルートレベル）
 *
 * @example
 * getCategoryDepth('') // => 0
 * getCategoryDepth('研究') // => 1
 * getCategoryDepth('研究/AI') // => 2
 * getCategoryDepth('研究/AI/ML') // => 3
 */
export function getCategoryDepth(categoryPath: string): number {
  const parts = splitCategoryPath(categoryPath);
  return parts.length;
}
