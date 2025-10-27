/**
 * @file PathServiceV2.ts
 * @summary 最小限のパスユーティリティ（V2構造対応）
 * @responsibility V2の階層的ディレクトリ構造に対応した、必要最小限のパス操作を提供
 *
 * 主な変更点（旧PathServiceから）:
 * - ❌ getFullPath() 削除 → Directoryオブジェクトが自動処理
 * - ❌ getParentPath() 削除 → Directory.parentで取得可能
 * - ❌ getFolderName() 削除 → メタデータから取得
 * - ❌ parseInputPath() 削除 → 上位レイヤーで処理
 * - ✅ normalizePath() 簡素化 → 互換性のため残す
 * - ✅ generateSlug() 追加 → typeV2から移動（中央管理）
 */

import { generateSlug as generateSlugFromCore } from '../data/core/slugUtils';

/**
 * 最小限のパスユーティリティサービス（V2）
 *
 * AsyncStorageの複雑なパス管理の名残を排除し、
 * expo-file-systemの自然な階層構造を活用するため、
 * 旧PathServiceの機能を大幅に削減（20%以下に縮小）。
 */
export class PathServiceV2 {
  /**
   * 仮想パスを正規化
   *
   * V2では、内部的にslugベースのパスを使用するため、
   * 先頭・末尾のスラッシュを除去して正規化します。
   *
   * @param path - 正規化するパス
   * @returns 正規化されたパス（ルートの場合は "/"）
   *
   * @example
   * normalizePath("/folder1/subfolder/") → "folder1/subfolder"
   * normalizePath("/") → "/"
   * normalizePath("") → "/"
   */
  static normalizePath(path: string): string {
    if (!path || path === '/') return '/';

    // 先頭・末尾のスラッシュを除去
    return path.replace(/^\/|\/$/g, '');
  }

  /**
   * Slug生成（フォルダ名からディレクトリ名を生成）
   *
   * フォルダ名をURL-safe/filesystem-safeな文字列に変換します。
   * typeV2.tsから移動し、ここで中央管理します。
   *
   * @param name - フォルダ名
   * @returns slug（ディレクトリ名）
   *
   * @example
   * generateSlug("Folder 1") → "folder-1"
   * generateSlug("日本語フォルダ") → "日本語-フォルダ"
   */
  static generateSlug(name: string): string {
    return generateSlugFromCore(name);
  }
}
