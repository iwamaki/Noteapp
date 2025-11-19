/**
 * @file index.ts
 * @summary file-list-flat ユーティリティ関数のエクスポート集約
 * @description
 * サニタイズ、カテゴリーパス操作、ファイルユーティリティなど、
 * file-list-flat フォルダで使用する全てのユーティリティ関数を集約。
 *
 * @example
 * // 個別インポート
 * import { sanitizeFilename, getCategoryNameFromPath } from './utils';
 *
 * // 名前空間インポート
 * import * as FileListUtils from './utils';
 */

// ========================================
// サニタイズ関連
// ========================================
export {
  sanitizeFilename,
  sanitizeCategoryPathForFileSystem,
  sanitizeCategoryPathForCollection,
  sanitizeDateForFilename,
} from './sanitization';

// ========================================
// カテゴリーパス操作
// ========================================
export {
  CATEGORY_SEPARATOR,
  splitCategoryPath,
  getCategoryNameFromPath,
  getParentCategoryPath,
  joinCategoryPath,
  filterFilesByCategory,
  isSubCategoryOf,
  getCategoryDepth,
} from './categoryPath';

// ========================================
// ファイルユーティリティ
// ========================================
export {
  generateUniqueKey,
  generateUniqueKeyFromFile,
  resolveDuplicateTitle,
  getExistingTitlesSet,
  getMetadataText,
  addCopySuffix,
  getContentPreview,
} from './fileUtils';
