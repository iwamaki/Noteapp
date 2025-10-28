/**
 * @file FileListUseCasesFlat.ts
 * @summary フラット構造のノートリストユースケース層
 * @description
 * フォルダ階層を廃止し、シンプルなファイル操作とメタデータ管理を提供。
 * FileListUseCasesV2.ts（352行）から大幅に簡素化（~150行）。
 *
 * 主な変更点:
 * - ❌ フォルダ操作の削除（createFolder, renameFolder, moveFolder）
 * - ❌ パス指定の削除（createFileWithPath → createFile）
 * - ❌ 移動操作の削除（フラット構造では不要）
 * - ✅ カテゴリー・タグベースの検索追加
 * - ✅ シンプルなCRUD操作
 */

import { FileFlat, CreateFileDataFlat, UpdateFileDataFlat } from '@data/core/typesFlat';
import { FileRepositoryFlat } from '@data/repositories/fileRepositoryFlat';
import { MetadataService } from '@data/services/metadataService';

/**
 * フラット構造のノートリストユースケース
 *
 * 特徴:
 * - フォルダ概念なし（完全フラット）
 * - カテゴリー・タグで整理
 * - 移動・パス指定不要
 * - シンプルで理解しやすい
 */
export class FileListUseCasesFlat {
  // =============================================================================
  // 取得操作
  // =============================================================================

  /**
   * 全ファイルを取得
   *
   * @returns 全ファイルの配列
   *
   * @example
   * const files = await FileListUseCasesFlat.getAllFiles();
   */
  static async getAllFiles(): Promise<FileFlat[]> {
    return await FileRepositoryFlat.getAll();
  }

  /**
   * カテゴリーでフィルタリングして取得
   *
   * @param categoryName - カテゴリー名
   * @returns カテゴリーに属するファイルの配列
   *
   * @example
   * const files = await FileListUseCasesFlat.getFilesByCategory('研究');
   */
  static async getFilesByCategory(categoryName: string): Promise<FileFlat[]> {
    return await MetadataService.getByCategory(categoryName);
  }

  /**
   * タグでフィルタリングして取得
   *
   * @param tagName - タグ名
   * @returns タグを持つファイルの配列
   *
   * @example
   * const files = await FileListUseCasesFlat.getFilesByTag('重要');
   */
  static async getFilesByTag(tagName: string): Promise<FileFlat[]> {
    return await MetadataService.getByTag(tagName);
  }

  /**
   * 複合検索
   *
   * @param options - 検索オプション
   * @returns 検索条件に一致するファイルの配列
   *
   * @example
   * const files = await FileListUseCasesFlat.searchFiles({
   *   categories: ['研究'],
   *   tags: ['重要'],
   *   searchText: 'machine learning',
   * });
   */
  static async searchFiles(options: {
    categories?: string[];
    tags?: string[];
    searchText?: string;
  }): Promise<FileFlat[]> {
    return await MetadataService.searchByMetadata(options);
  }

  // =============================================================================
  // 作成操作
  // =============================================================================

  /**
   * ファイルを作成
   *
   * V2との違い:
   * - ❌ パス指定不要（createFileWithPath → createFile）
   * - ✅ カテゴリー・タグを直接指定
   * - ✅ 超シンプル！
   *
   * @param title - ファイルタイトル
   * @param content - ファイル内容
   * @param categories - カテゴリーの配列
   * @param tags - タグの配列
   * @returns 作成されたファイル
   *
   * @example
   * const file = await FileListUseCasesFlat.createFile(
   *   'My Note',
   *   'Content...',
   *   ['研究', '論文メモ'],
   *   ['重要']
   * );
   */
  static async createFile(
    title: string,
    content: string = '',
    categories: string[] = [],
    tags: string[] = []
  ): Promise<FileFlat> {
    // 1. バリデーション
    const validation = this.validateFileName(title);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. 作成データ
    const fileData: CreateFileDataFlat = {
      title,
      content,
      categories,
      tags,
    };

    // 3. 作成
    return await FileRepositoryFlat.create(fileData);
  }

  // =============================================================================
  // 更新操作
  // =============================================================================

  /**
   * ファイルをリネーム
   *
   * V2との違い:
   * - ❌ 重複チェック不要（フォルダ内の重複を気にしなくていい）
   * - ✅ シンプル！
   *
   * @param fileId - ファイルID
   * @param newTitle - 新しいタイトル
   * @returns 更新されたファイル
   *
   * @throws バリデーションエラー
   */
  static async renameFile(fileId: string, newTitle: string): Promise<FileFlat> {
    // 1. バリデーション
    const validation = this.validateFileName(newTitle);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // 2. 更新
    return await FileRepositoryFlat.update(fileId, { title: newTitle });
  }

  /**
   * ファイルのカテゴリーを更新
   *
   * @param fileId - ファイルID
   * @param categories - 新しいカテゴリーの配列
   * @returns 更新されたファイル
   */
  static async updateFileCategories(
    fileId: string,
    categories: string[]
  ): Promise<FileFlat> {
    return await MetadataService.updateCategories(fileId, categories);
  }

  /**
   * ファイルのタグを更新
   *
   * @param fileId - ファイルID
   * @param tags - 新しいタグの配列
   * @returns 更新されたファイル
   */
  static async updateFileTags(fileId: string, tags: string[]): Promise<FileFlat> {
    return await MetadataService.updateTags(fileId, tags);
  }

  // =============================================================================
  // 削除操作
  // =============================================================================

  /**
   * 選択されたファイルを削除
   *
   * V2との違い:
   * - ❌ フォルダ削除なし（folderIds削除）
   * - ✅ ファイルのみの削除でシンプル！
   *
   * @param fileIds - 削除するファイルIDの配列
   */
  static async deleteSelectedFiles(fileIds: string[]): Promise<void> {
    await FileRepositoryFlat.batchDelete(fileIds);
  }

  // =============================================================================
  // コピー操作
  // =============================================================================

  /**
   * ファイルをコピー
   *
   * V2との違い:
   * - ❌ 親フォルダパス取得不要
   * - ✅ 同じ階層にコピー（タイトルに"- コピー"を追加）
   *
   * @param fileIds - コピーするファイルIDの配列
   * @returns コピーされたファイルの配列
   */
  static async copyFiles(fileIds: string[]): Promise<FileFlat[]> {
    const copiedFiles: FileFlat[] = [];

    for (const fileId of fileIds) {
      const file = await FileRepositoryFlat.getById(fileId);
      if (!file) continue;

      // タイトルに"- コピー"を追加
      const newTitle = `${file.title} - コピー`;

      // コピーを作成
      const copied = await FileRepositoryFlat.create({
        title: newTitle,
        content: file.content,
        categories: file.categories,
        tags: file.tags,
        summary: file.summary,
        relatedNoteIds: file.relatedNoteIds,
      });

      copiedFiles.push(copied);
    }

    return copiedFiles;
  }

  // =============================================================================
  // バリデーション
  // =============================================================================

  /**
   * ファイル名のバリデーション
   *
   * @param fileName - ファイル名
   * @returns バリデーション結果
   */
  static validateFileName(fileName: string): { valid: boolean; error?: string } {
    const trimmed = fileName.trim();

    if (!trimmed) {
      return { valid: false, error: 'ファイル名を入力してください' };
    }

    if (trimmed.length > 255) {
      return { valid: false, error: 'ファイル名は255文字以内にしてください' };
    }

    // 禁止文字チェック（ファイルシステムに依存する文字を避ける）
    const invalidChars = /[<>:"|?*\x00-\x1F]/;
    if (invalidChars.test(trimmed)) {
      return { valid: false, error: 'ファイル名に使用できない文字が含まれています' };
    }

    return { valid: true };
  }

  /**
   * アイテムの存在チェック
   *
   * @param fileIds - ファイルIDの配列
   * @returns バリデーション結果
   */
  static async validateFilesExist(
    fileIds: string[]
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const fileId of fileIds) {
      const file = await FileRepositoryFlat.getById(fileId);
      if (!file) {
        errors.push(`ファイル ${fileId} が見つかりません`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
