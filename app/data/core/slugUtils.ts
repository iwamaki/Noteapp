/**
 * @file slugUtils.ts
 * @summary Slug生成・バリデーションユーティリティ
 * @description
 * フォルダ名からURL-safeなslugを生成し、
 * ファイルシステムのディレクトリ名として使用します。
 */

/**
 * フォルダ名からslugを生成
 *
 * @param name - フォルダ名（例: "My Folder 1"）
 * @returns URL-safeなslug（例: "my-folder-1"）
 *
 * @example
 * generateSlug("My Folder") // => "my-folder"
 * generateSlug("Folder 1") // => "folder-1"
 * generateSlug("Test@#$Folder") // => "test-folder"
 * generateSlug("こんにちは") // => ""
 * generateSlug("") // => ""
 *
 * @remarks
 * - 英数字以外は "-" に置換される
 * - 日本語などの非ASCII文字も "-" になる
 * - 空のslugになる場合は、呼び出し側で適切な処理が必要
 * - 重複チェックは呼び出し側で実施すること
 */
export const generateSlug = (name: string): string => {
  if (!name) return '';

  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // 英数字以外をハイフンに
    .replace(/^-+|-+$/g, '');      // 前後のハイフンを削除
};

/**
 * slugが有効かバリデーション
 *
 * @param slug - 検証するslug
 * @returns 有効な場合true
 *
 * @example
 * isValidSlug("my-folder") // => true
 * isValidSlug("folder-1") // => true
 * isValidSlug("") // => false
 * isValidSlug("my_folder") // => false (アンダースコアは不可)
 * isValidSlug("-folder") // => false (先頭ハイフンは不可)
 */
export const isValidSlug = (slug: string): boolean => {
  if (!slug) return false;

  // 英数字とハイフンのみ、先頭・末尾はハイフン不可
  const slugPattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
};

/**
 * slug重複回避のためのサフィックスを生成
 *
 * @param baseSlug - ベースとなるslug
 * @param counter - カウンター（1から開始）
 * @returns サフィックス付きslug
 *
 * @example
 * generateSlugWithSuffix("my-folder", 1) // => "my-folder-1"
 * generateSlugWithSuffix("my-folder", 2) // => "my-folder-2"
 */
export const generateSlugWithSuffix = (baseSlug: string, counter: number): string => {
  return `${baseSlug}-${counter}`;
};
