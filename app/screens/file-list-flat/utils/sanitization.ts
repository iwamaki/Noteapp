/**
 * @file sanitization.ts
 * @summary サニタイズ関連のユーティリティ関数
 * @description
 * ファイル名、カテゴリーパス、コレクション名などのサニタイズ処理を提供。
 * セキュリティとファイルシステムの互換性を確保。
 */

/**
 * ファイル名をサニタイズ（不正な文字を除去）
 *
 * ファイルシステムで使用できない文字を置換し、
 * 安全なファイル名に変換します。
 *
 * @param filename - サニタイズするファイル名
 * @returns サニタイズされたファイル名
 *
 * @example
 * sanitizeFilename('my/file<name>.txt') // => 'my_file_name_.txt'
 *
 * @remarks
 * 以下の文字を '_' に置換：< > : " / \ | ? *
 */
export function sanitizeFilename(filename: string): string {
  // ファイルシステムで使用できない文字を置換
  return filename.replace(/[<>:"/\\|?*]/g, '_').trim();
}

/**
 * カテゴリーパスの各階層をサニタイズ
 *
 * カテゴリーパスをスラッシュで分割し、各階層を個別にサニタイズして
 * 再結合します。これによりフォルダ階層構造を維持したまま、
 * 不正な文字を除去できます。
 *
 * @param categoryPath - カテゴリーパス（例: "01_調べ物/技術"）
 * @returns サニタイズされたカテゴリーパス
 *
 * @example
 * sanitizeCategoryPathForFileSystem('研究/AI<ML>') // => '研究/AI_ML_'
 * sanitizeCategoryPathForFileSystem('a//b///c') // => 'a/b/c'
 */
export function sanitizeCategoryPathForFileSystem(categoryPath: string): string {
  if (!categoryPath || categoryPath.trim() === '') {
    return '';
  }

  // カテゴリの各階層をサニタイズ
  const categoryParts = categoryPath
    .split('/')
    .map((part) => sanitizeFilename(part.trim()))
    .filter((part) => part.length > 0); // 空の階層を除去

  return categoryParts.join('/');
}

/**
 * カテゴリーパスをコレクション名にサニタイズ
 *
 * RAG（知識ベース）のコレクション名として使用するために、
 * カテゴリーパスをサニタイズします。スラッシュをアンダースコアに
 * 置換し、プレフィックスを追加します。
 *
 * @param categoryPath - カテゴリーのパス（例: "01_調べ物/技術"）
 * @returns サニタイズされたコレクション名（例: "category_01_調べ物_技術"）
 *
 * @example
 * sanitizeCategoryPathForCollection('01_調べ物/技術/AI')
 * // => 'category_01_調べ物_技術_AI'
 *
 * sanitizeCategoryPathForCollection('//a///b//')
 * // => 'category_a_b'
 */
export function sanitizeCategoryPathForCollection(categoryPath: string): string {
  // スラッシュをアンダースコアに置換
  let sanitized = categoryPath.replace(/\//g, '_');

  // 連続するアンダースコアを1つに
  sanitized = sanitized.replace(/_+/g, '_');

  // 前後のアンダースコアを削除
  sanitized = sanitized.replace(/^_|_$/g, '');

  // プレフィックスを追加
  return `category_${sanitized}`;
}

/**
 * 日付フォーマット用のサニタイズ
 *
 * ファイル名に含める日付文字列から、ファイルシステムで
 * 問題となる文字（コロン、ピリオド）を除去します。
 *
 * @param dateString - 日付文字列（例: "2024-01-15T10:30:00.000Z"）
 * @returns サニタイズされた日付文字列（例: "2024-01-15T10-30-00-000Z"）
 *
 * @example
 * const timestamp = new Date().toISOString();
 * sanitizeDateForFilename(timestamp) // => '2024-01-15T10-30-00-000Z'
 */
export function sanitizeDateForFilename(dateString: string): string {
  return dateString.replace(/[:.]/g, '-');
}
