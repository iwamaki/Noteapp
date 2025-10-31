/**
 * @file categoryOperationsService.ts
 * @summary カテゴリー操作サービス
 * @description
 * カテゴリーに対する操作（削除、移動、名前変更、コピー）を提供。
 * ディレクトリ操作と同様の直感的な動作を実現。
 *
 * 動作仕様:
 * - 削除: カテゴリー配下のファイル・子カテゴリーをすべて削除
 * - 移動: カテゴリー配下のファイル・子カテゴリーをすべて移動
 * - 名前変更: 同じ親内での移動として実装
 * - コピー: カテゴリー配下のファイル・子カテゴリーをすべて複製
 */

import { FileFlat } from '../core/typesFlat';
import { FileRepository } from '../repositories/fileRepository';

/**
 * カテゴリー影響範囲情報
 */
export interface CategoryImpact {
  /** 直接属するファイル数 */
  directFileCount: number;
  /** 子カテゴリー一覧（パスとファイル数） */
  childCategories: Array<{ path: string; fileCount: number }>;
  /** 合計ファイル数（直接 + 子孫） */
  totalFileCount: number;
  /** 影響を受けるすべてのファイル */
  affectedFiles: FileFlat[];
}

/**
 * カテゴリー操作サービス
 */
export class CategoryOperationsService {
  // =============================================================================
  // Private Helper Methods
  // =============================================================================

  /**
   * カテゴリー配下の全ファイルを取得
   *
   * @param categoryPath - カテゴリーパス（例: "研究/AI"）
   * @returns カテゴリー配下のすべてのファイル
   *
   * @remarks
   * - 完全一致するファイル（category === categoryPath）
   * - 子カテゴリーのファイル（category.startsWith(categoryPath + '/')）
   */
  private static async getAffectedFiles(categoryPath: string): Promise<FileFlat[]> {
    const allFiles = await FileRepository.getAll();
    return allFiles.filter(
      file => file.category === categoryPath ||
              file.category.startsWith(categoryPath + '/')
    );
  }

  // =============================================================================
  // Public Methods - Impact Analysis
  // =============================================================================

  /**
   * カテゴリー操作の影響範囲を取得
   *
   * @param categoryPath - カテゴリーパス
   * @returns 影響範囲情報
   *
   * @example
   * const impact = await CategoryOperationsService.getCategoryImpact('研究/AI');
   * // {
   * //   directFileCount: 8,
   * //   childCategories: [
   * //     { path: '研究/AI/深層学習', fileCount: 5 },
   * //     { path: '研究/AI/強化学習', fileCount: 2 }
   * //   ],
   * //   totalFileCount: 15,
   * //   affectedFiles: [...]
   * // }
   *
   * @remarks
   * 確認ダイアログで影響範囲を表示するために使用
   */
  static async getCategoryImpact(categoryPath: string): Promise<CategoryImpact> {
    const allFiles = await FileRepository.getAll();

    // 直接属するファイル
    const directFiles = allFiles.filter(f => f.category === categoryPath);

    // 子孫ファイル（子カテゴリー配下のファイル）
    const descendantFiles = allFiles.filter(
      f => f.category.startsWith(categoryPath + '/')
    );

    // 子カテゴリーをグループ化（直接の子のみ）
    const childCategoryMap = new Map<string, number>();
    for (const file of descendantFiles) {
      const parts = file.category.split('/');
      const parentDepth = categoryPath.split('/').length;

      // 直接の子カテゴリーのみ抽出
      if (parts.length > parentDepth) {
        const childPath = parts.slice(0, parentDepth + 1).join('/');
        childCategoryMap.set(childPath, (childCategoryMap.get(childPath) || 0) + 1);
      }
    }

    return {
      directFileCount: directFiles.length,
      childCategories: Array.from(childCategoryMap.entries())
        .map(([path, fileCount]) => ({ path, fileCount }))
        .sort((a, b) => b.fileCount - a.fileCount), // ファイル数の多い順
      totalFileCount: directFiles.length + descendantFiles.length,
      affectedFiles: [...directFiles, ...descendantFiles],
    };
  }

  // =============================================================================
  // Public Methods - Category Operations
  // =============================================================================

  /**
   * カテゴリーを削除（配下のファイル・子カテゴリーもすべて削除）
   *
   * @param categoryPath - 削除するカテゴリーパス
   * @param onProgress - 進捗コールバック (current, total) => void
   *
   * @example
   * await CategoryOperationsService.deleteCategory('研究/AI', (current, total) => {
   *   console.log(`${current}/${total} 削除中...`);
   * });
   *
   * @remarks
   * - ディレクトリ削除と同じ動作（rm -rf）
   * - 取り消し不可能な操作のため、事前に確認ダイアログ必須
   */
  static async deleteCategory(
    categoryPath: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    const affectedFiles = await this.getAffectedFiles(categoryPath);
    const fileIds = affectedFiles.map(f => f.id);

    // プログレス付きで削除
    for (let i = 0; i < fileIds.length; i++) {
      await FileRepository.delete(fileIds[i]);
      onProgress?.(i + 1, fileIds.length);
    }
  }

  /**
   * カテゴリーを移動/名前変更（配下のファイル・子カテゴリーもすべて移動）
   *
   * @param oldPath - 現在のカテゴリーパス
   * @param newPath - 新しいカテゴリーパス
   * @param onProgress - 進捗コールバック (current, total) => void
   *
   * @example
   * // 移動
   * await CategoryOperationsService.moveCategory('研究/AI', '技術/AI');
   *
   * // 名前変更（同じ親内での移動）
   * await CategoryOperationsService.moveCategory('研究/AI', '研究/機械学習');
   *
   * @remarks
   * - ディレクトリ移動と同じ動作（mv）
   * - 子カテゴリーも含めて階層構造を保持したまま移動
   */
  static async moveCategory(
    oldPath: string,
    newPath: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    // パスの検証
    if (oldPath === newPath) {
      throw new Error('移動先が同じです');
    }

    // 循環参照チェック（新しいパスが古いパスの子孫でないこと）
    if (newPath.startsWith(oldPath + '/')) {
      throw new Error('カテゴリーを自分自身の子カテゴリーに移動することはできません');
    }

    const affectedFiles = await this.getAffectedFiles(oldPath);

    // プログレス付きで更新
    for (let i = 0; i < affectedFiles.length; i++) {
      const file = affectedFiles[i];

      // パスを置換
      const newCategory = file.category === oldPath
        ? newPath
        : file.category.replace(oldPath + '/', newPath + '/');

      await FileRepository.update(file.id, { category: newCategory });
      onProgress?.(i + 1, affectedFiles.length);
    }
  }

  /**
   * カテゴリーをコピー（配下のファイル・子カテゴリーもすべて複製）
   *
   * @param sourcePath - コピー元カテゴリーパス
   * @param targetPath - コピー先カテゴリーパス
   * @param onProgress - 進捗コールバック (current, total) => void
   *
   * @example
   * await CategoryOperationsService.copyCategory(
   *   '研究/AI',
   *   '個人/AI学習メモ',
   *   (current, total) => console.log(`${current}/${total} コピー中...`)
   * );
   *
   * @remarks
   * - 元のカテゴリーはそのまま残る
   * - ファイル数が多い場合は時間がかかる
   * - ストレージ容量を消費するため注意
   */
  static async copyCategory(
    sourcePath: string,
    targetPath: string,
    onProgress?: (current: number, total: number) => void
  ): Promise<void> {
    // パスの検証
    if (sourcePath === targetPath) {
      throw new Error('コピー先が同じです');
    }

    const affectedFiles = await this.getAffectedFiles(sourcePath);

    // プログレス付きで複製
    for (let i = 0; i < affectedFiles.length; i++) {
      const file = affectedFiles[i];

      // パスを置換
      const newCategory = file.category === sourcePath
        ? targetPath
        : file.category.replace(sourcePath + '/', targetPath + '/');

      await FileRepository.create({
        title: file.title,
        content: file.content,
        category: newCategory,
        tags: file.tags,
        summary: file.summary,
        relatedNoteIds: file.relatedNoteIds,
      });

      onProgress?.(i + 1, affectedFiles.length);
    }
  }

  // =============================================================================
  // Validation Methods
  // =============================================================================

  /**
   * カテゴリーパスのバリデーション
   *
   * @param path - カテゴリーパス
   * @returns バリデーション結果
   */
  static validateCategoryPath(path: string): { valid: boolean; error?: string } {
    const trimmed = path.trim();

    if (!trimmed) {
      return { valid: false, error: 'カテゴリー名を入力してください' };
    }

    if (trimmed.length > 255) {
      return { valid: false, error: 'カテゴリー名は255文字以内にしてください' };
    }

    // 禁止文字チェック
    const invalidChars = /[<>:"|?*\x00-\x1F]/;
    if (invalidChars.test(trimmed)) {
      return { valid: false, error: 'カテゴリー名に使用できない文字が含まれています' };
    }

    // 先頭・末尾のスラッシュをチェック
    if (trimmed.startsWith('/') || trimmed.endsWith('/')) {
      return { valid: false, error: 'カテゴリー名の先頭・末尾にスラッシュは使用できません' };
    }

    // 連続するスラッシュをチェック
    if (trimmed.includes('//')) {
      return { valid: false, error: 'カテゴリー名に連続するスラッシュは使用できません' };
    }

    return { valid: true };
  }

  /**
   * カテゴリーが存在するかチェック
   *
   * @param categoryPath - カテゴリーパス
   * @returns カテゴリーが存在する場合 true
   */
  static async categoryExists(categoryPath: string): Promise<boolean> {
    const allFiles = await FileRepository.getAll();
    return allFiles.some(
      file => file.category === categoryPath ||
              file.category.startsWith(categoryPath + '/')
    );
  }
}
