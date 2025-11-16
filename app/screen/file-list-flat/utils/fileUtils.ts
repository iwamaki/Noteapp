/**
 * @file fileUtils.ts
 * @summary ファイル関連のユーティリティ関数
 * @description
 * ファイルのユニークキー生成、重複タイトル解決、メタデータ表示などの
 * ファイル操作に関する共通処理を提供。
 */

import { FileFlat } from '@data/core/typesFlat';

/**
 * ファイルのユニークキーを生成
 *
 * カテゴリーとタイトルを組み合わせて、ファイルを一意に識別するための
 * キーを生成します。重複チェックやマップのキーとして使用できます。
 *
 * @param category - カテゴリーパス（空文字列も可）
 * @param title - ファイルタイトル
 * @returns ユニークキー（形式: "category/title"）
 *
 * @example
 * generateUniqueKey('研究/AI', 'ノート1') // => '研究/AI/ノート1'
 * generateUniqueKey('', 'ノート1') // => '/ノート1'
 * generateUniqueKey('未分類', 'メモ') // => '未分類/メモ'
 *
 * @remarks
 * - カテゴリーが空の場合でも、先頭にスラッシュを付けることで一貫性を保つ
 * - ファイルの重複チェックやSet/Mapのキーとして使用可能
 */
export function generateUniqueKey(category: string, title: string): string {
  return `${category}/${title}`;
}

/**
 * ファイルオブジェクトからユニークキーを生成
 *
 * FileFlat オブジェクトからユニークキーを生成します。
 *
 * @param file - ファイルオブジェクト
 * @returns ユニークキー（形式: "category/title"）
 *
 * @example
 * const file = { category: '研究/AI', title: 'ノート1', ... };
 * generateUniqueKeyFromFile(file) // => '研究/AI/ノート1'
 */
export function generateUniqueKeyFromFile(file: FileFlat): string {
  return generateUniqueKey(file.category || '', file.title);
}

/**
 * 重複タイトルの解決
 *
 * 既存のタイトルと重複しない新しいタイトルを生成します。
 * 「(コピー)」「(コピー2)」のように番号を付けて重複を回避します。
 *
 * @param title - 元のタイトル
 * @param existingTitles - 既存のタイトル（またはユニークキー）のセット
 * @returns 重複しないタイトル
 *
 * @example
 * const existing = new Set(['ノート1', 'ノート1 (コピー)']);
 * resolveDuplicateTitle('ノート1', existing) // => 'ノート1 (コピー2)'
 *
 * @remarks
 * - 最初の重複は「(コピー)」
 * - 2回目以降は「(コピー2)」「(コピー3)」...
 * - 既存のタイトルセットは変更されない（読み取り専用）
 */
export function resolveDuplicateTitle(title: string, existingTitles: Set<string>): string {
  let finalTitle = title;
  let copyCounter = 1;

  while (existingTitles.has(finalTitle)) {
    finalTitle = `${title} (コピー${copyCounter > 1 ? copyCounter : ''})`;
    copyCounter++;
  }

  return finalTitle;
}

/**
 * 複数ファイルから既存タイトルのセットを生成
 *
 * ファイル配列から、重複チェック用のユニークキーセットを生成します。
 *
 * @param files - ファイルの配列
 * @returns ユニークキーのセット
 *
 * @example
 * const files = [
 *   { category: '研究', title: 'ノート1', ... },
 *   { category: '個人', title: 'メモ', ... },
 * ];
 * getExistingTitlesSet(files)
 * // => Set(['研究/ノート1', '個人/メモ'])
 */
export function getExistingTitlesSet(files: FileFlat[]): Set<string> {
  return new Set(files.map((file) => generateUniqueKeyFromFile(file)));
}

/**
 * メタデータ表示用のテキストを生成
 *
 * ファイルのカテゴリーとタグを組み合わせて、
 * UI表示用のメタデータテキストを生成します。
 *
 * @param file - ファイルオブジェクト
 * @returns メタデータ表示用テキスト
 *
 * @example
 * const file1 = { category: '研究/AI', tags: ['重要', '進行中'], ... };
 * getMetadataText(file1) // => '研究/AI • #重要 #進行中'
 *
 * const file2 = { category: '', tags: [], ... };
 * getMetadataText(file2) // => 'メタデータなし'
 *
 * const file3 = { category: '個人メモ', tags: [], ... };
 * getMetadataText(file3) // => '個人メモ'
 *
 * @remarks
 * - カテゴリーとタグがない場合は「メタデータなし」を返す
 * - カテゴリーとタグがある場合は「 • 」で区切る
 * - タグには「#」プレフィックスを付ける
 */
export function getMetadataText(file: FileFlat): string {
  const parts: string[] = [];

  if (file.category) {
    parts.push(file.category);
  }

  if (file.tags.length > 0) {
    const tagText = file.tags.map((tag) => `#${tag}`).join(' ');
    parts.push(tagText);
  }

  return parts.length > 0 ? parts.join(' • ') : 'メタデータなし';
}

/**
 * ファイルタイトルにコピーサフィックスを追加
 *
 * ファイルをコピーする際に、タイトルに「 - コピー」を追加します。
 *
 * @param title - 元のタイトル
 * @returns コピーサフィックスが追加されたタイトル
 *
 * @example
 * addCopySuffix('ノート1') // => 'ノート1 - コピー'
 */
export function addCopySuffix(title: string): string {
  return `${title} - コピー`;
}

/**
 * ファイルの内容プレビューを生成
 *
 * ファイルの内容から、指定された文字数以内のプレビューテキストを生成します。
 * 改行を除去し、必要に応じて末尾に「...」を追加します。
 *
 * @param content - ファイルの内容
 * @param maxLength - 最大文字数（デフォルト: 100）
 * @returns プレビューテキスト
 *
 * @example
 * const longText = 'これは長いテキストです。'.repeat(20);
 * getContentPreview(longText, 50)
 * // => 'これは長いテキストです。これは長いテキストです。これは長いテキ...'
 */
export function getContentPreview(content: string, maxLength: number = 100): string {
  // 改行を除去
  const singleLine = content.replace(/\n/g, ' ').trim();

  if (singleLine.length <= maxLength) {
    return singleLine;
  }

  return singleLine.substring(0, maxLength) + '...';
}
