/**
 * @file metadataService.ts
 * @summary メタデータ管理サービス
 * @description
 * フラット構造のファイルに対するメタデータ操作を提供。
 * カテゴリー、タグでの検索・フィルタリング、統計情報の取得など。
 *
 * 主な機能:
 * - カテゴリー/タグによるフィルタリング
 * - 複合検索（カテゴリー + タグ + テキスト）
 * - 統計情報の取得（カテゴリー/タグごとのファイル数）
 * - メタデータ一括更新
 */

import type {
  FileFlat,
  CategoryInfo,
  TagInfo,
  MetadataSearchOptions,
} from '../core/typesFlat';
import { FileRepository } from '../repositories/fileRepository';

// =============================================================================
// MetadataService Class
// =============================================================================

/**
 * メタデータ管理サービス
 */
export class MetadataService {
  // =============================================================================
  // カテゴリー操作
  // =============================================================================

  /**
   * 指定されたカテゴリーに属するファイルを取得
   *
   * @param categoryName - カテゴリー名
   * @returns カテゴリーに属するファイルの配列
   *
   * @example
   * const files = await MetadataService.getByCategory('研究');
   *
   * @remarks
   * カテゴリーは複数持てるため、指定されたカテゴリーが
   * categoriesフィールドに含まれているファイルを返す。
   */
  static async getByCategory(categoryName: string): Promise<FileFlat[]> {
    const allFiles = await FileRepository.getAll();
    return allFiles.filter((file) =>
      file.categories.includes(categoryName)
    );
  }

  /**
   * 複数のカテゴリーのいずれかに属するファイルを取得（OR検索）
   *
   * @param categoryNames - カテゴリー名の配列
   * @returns いずれかのカテゴリーに属するファイルの配列
   *
   * @example
   * const files = await MetadataService.getByCategoriesOr(['研究', '論文メモ']);
   */
  static async getByCategoriesOr(categoryNames: string[]): Promise<FileFlat[]> {
    const allFiles = await FileRepository.getAll();
    return allFiles.filter((file) =>
      file.categories.some((cat) => categoryNames.includes(cat))
    );
  }

  /**
   * 全カテゴリーの統計情報を取得
   *
   * @returns カテゴリー情報の配列（ファイル数でソート）
   *
   * @example
   * const categories = await MetadataService.getAllCategories();
   * // => [{ name: '研究', fileCount: 15 }, { name: '個人', fileCount: 8 }, ...]
   *
   * @remarks
   * UI表示用（カテゴリービュー、サイドバーなど）
   */
  static async getAllCategories(): Promise<CategoryInfo[]> {
    const allFiles = await FileRepository.getAll();

    // カテゴリーごとのファイル数をカウント
    const categoryMap = new Map<string, number>();

    for (const file of allFiles) {
      for (const category of file.categories) {
        const count = categoryMap.get(category) || 0;
        categoryMap.set(category, count + 1);
      }
    }

    // CategoryInfo配列に変換し、ファイル数でソート
    const categories: CategoryInfo[] = Array.from(categoryMap.entries()).map(
      ([name, fileCount]) => ({
        name,
        fileCount,
      })
    );

    // ファイル数の多い順にソート
    return categories.sort((a, b) => b.fileCount - a.fileCount);
  }

  // =============================================================================
  // タグ操作
  // =============================================================================

  /**
   * 指定されたタグを持つファイルを取得
   *
   * @param tagName - タグ名
   * @returns タグを持つファイルの配列
   *
   * @example
   * const files = await MetadataService.getByTag('重要');
   */
  static async getByTag(tagName: string): Promise<FileFlat[]> {
    const allFiles = await FileRepository.getAll();
    return allFiles.filter((file) => file.tags.includes(tagName));
  }

  /**
   * 複数のタグのいずれかを持つファイルを取得（OR検索）
   *
   * @param tagNames - タグ名の配列
   * @returns いずれかのタグを持つファイルの配列
   *
   * @example
   * const files = await MetadataService.getByTagsOr(['重要', 'TODO']);
   */
  static async getByTagsOr(tagNames: string[]): Promise<FileFlat[]> {
    const allFiles = await FileRepository.getAll();
    return allFiles.filter((file) =>
      file.tags.some((tag) => tagNames.includes(tag))
    );
  }

  /**
   * 複数のタグすべてを持つファイルを取得（AND検索）
   *
   * @param tagNames - タグ名の配列
   * @returns すべてのタグを持つファイルの配列
   *
   * @example
   * const files = await MetadataService.getByTagsAnd(['重要', 'TODO']);
   */
  static async getByTagsAnd(tagNames: string[]): Promise<FileFlat[]> {
    const allFiles = await FileRepository.getAll();
    return allFiles.filter((file) =>
      tagNames.every((tag) => file.tags.includes(tag))
    );
  }

  /**
   * 全タグの統計情報を取得
   *
   * @returns タグ情報の配列（ファイル数でソート）
   *
   * @example
   * const tags = await MetadataService.getAllTags();
   * // => [{ name: '重要', fileCount: 25 }, { name: 'TODO', fileCount: 12 }, ...]
   *
   * @remarks
   * UI表示用（タグクラウド、タグ一覧など）
   */
  static async getAllTags(): Promise<TagInfo[]> {
    const allFiles = await FileRepository.getAll();

    // タグごとのファイル数をカウント
    const tagMap = new Map<string, number>();

    for (const file of allFiles) {
      for (const tag of file.tags) {
        const count = tagMap.get(tag) || 0;
        tagMap.set(tag, count + 1);
      }
    }

    // TagInfo配列に変換し、ファイル数でソート
    const tags: TagInfo[] = Array.from(tagMap.entries()).map(
      ([name, fileCount]) => ({
        name,
        fileCount,
      })
    );

    // ファイル数の多い順にソート
    return tags.sort((a, b) => b.fileCount - a.fileCount);
  }

  // =============================================================================
  // 複合検索
  // =============================================================================

  /**
   * メタデータによる複合検索
   *
   * @param options - 検索オプション
   * @returns 検索条件に一致するファイルの配列
   *
   * @example
   * // カテゴリー「研究」かつタグ「重要」を持つファイル
   * const files = await MetadataService.searchByMetadata({
   *   categories: ['研究'],
   *   tags: ['重要'],
   * });
   *
   * // テキスト検索も含む
   * const files2 = await MetadataService.searchByMetadata({
   *   categories: ['研究'],
   *   searchText: 'machine learning',
   * });
   *
   * @remarks
   * - categories: OR検索（いずれかのカテゴリーに属する）
   * - tags: OR検索（いずれかのタグを持つ）
   * - searchText: タイトルと内容で部分一致検索
   * - 各条件はANDで結合される
   */
  static async searchByMetadata(
    options: MetadataSearchOptions
  ): Promise<FileFlat[]> {
    let results = await FileRepository.getAll();

    // カテゴリーフィルター（OR検索）
    if (options.categories && options.categories.length > 0) {
      results = results.filter((file) =>
        file.categories.some((cat) => options.categories?.includes(cat))
      );
    }

    // タグフィルター（OR検索）
    if (options.tags && options.tags.length > 0) {
      results = results.filter((file) =>
        file.tags.some((tag) => options.tags?.includes(tag))
      );
    }

    // テキスト検索（タイトルと内容）
    if (options.searchText && options.searchText.trim() !== '') {
      const searchLower = options.searchText.toLowerCase();
      results = results.filter(
        (file) =>
          file.title.toLowerCase().includes(searchLower) ||
          file.content.toLowerCase().includes(searchLower)
      );
    }

    return results;
  }

  // =============================================================================
  // メタデータ更新ヘルパー
  // =============================================================================

  /**
   * ファイルのカテゴリーを更新
   *
   * @param fileId - ファイルID
   * @param categories - 新しいカテゴリーの配列
   * @returns 更新されたファイル
   *
   * @example
   * await MetadataService.updateCategories('file-uuid-123', ['研究', '論文メモ']);
   */
  static async updateCategories(
    fileId: string,
    categories: string[]
  ): Promise<FileFlat> {
    return await FileRepository.update(fileId, { categories });
  }

  /**
   * ファイルのタグを更新
   *
   * @param fileId - ファイルID
   * @param tags - 新しいタグの配列
   * @returns 更新されたファイル
   *
   * @example
   * await MetadataService.updateTags('file-uuid-123', ['重要', 'TODO']);
   */
  static async updateTags(fileId: string, tags: string[]): Promise<FileFlat> {
    return await FileRepository.update(fileId, { tags });
  }

  /**
   * ファイルにカテゴリーを追加
   *
   * @param fileId - ファイルID
   * @param categoryName - 追加するカテゴリー名
   * @returns 更新されたファイル
   */
  static async addCategory(
    fileId: string,
    categoryName: string
  ): Promise<FileFlat> {
    const file = await FileRepository.getById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // 既に存在する場合は何もしない
    if (file.categories.includes(categoryName)) {
      return file;
    }

    const updatedCategories = [...file.categories, categoryName];
    return await FileRepository.update(fileId, {
      categories: updatedCategories,
    });
  }

  /**
   * ファイルからカテゴリーを削除
   *
   * @param fileId - ファイルID
   * @param categoryName - 削除するカテゴリー名
   * @returns 更新されたファイル
   */
  static async removeCategory(
    fileId: string,
    categoryName: string
  ): Promise<FileFlat> {
    const file = await FileRepository.getById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    const updatedCategories = file.categories.filter(
      (cat) => cat !== categoryName
    );
    return await FileRepository.update(fileId, {
      categories: updatedCategories,
    });
  }

  /**
   * ファイルにタグを追加
   *
   * @param fileId - ファイルID
   * @param tagName - 追加するタグ名
   * @returns 更新されたファイル
   */
  static async addTag(fileId: string, tagName: string): Promise<FileFlat> {
    const file = await FileRepository.getById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // 既に存在する場合は何もしない
    if (file.tags.includes(tagName)) {
      return file;
    }

    const updatedTags = [...file.tags, tagName];
    return await FileRepository.update(fileId, { tags: updatedTags });
  }

  /**
   * ファイルからタグを削除
   *
   * @param fileId - ファイルID
   * @param tagName - 削除するタグ名
   * @returns 更新されたファイル
   */
  static async removeTag(fileId: string, tagName: string): Promise<FileFlat> {
    const file = await FileRepository.getById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    const updatedTags = file.tags.filter((tag) => tag !== tagName);
    return await FileRepository.update(fileId, { tags: updatedTags });
  }

  // =============================================================================
  // LLM生成メタデータ操作
  // =============================================================================

  /**
   * ファイルの要約を更新（LLM生成）
   *
   * @param fileId - ファイルID
   * @param summary - 要約テキスト
   * @returns 更新されたファイル
   *
   * @example
   * await MetadataService.updateSummary('file-uuid-123', 'This note discusses...');
   */
  static async updateSummary(
    fileId: string,
    summary: string
  ): Promise<FileFlat> {
    return await FileRepository.update(fileId, { summary });
  }

  /**
   * ファイルの関連メモIDを更新（LLM生成）
   *
   * @param fileId - ファイルID
   * @param relatedNoteIds - 関連メモIDの配列
   * @returns 更新されたファイル
   *
   * @example
   * await MetadataService.updateRelatedNotes('file-uuid-123', ['note-1', 'note-2']);
   */
  static async updateRelatedNotes(
    fileId: string,
    relatedNoteIds: string[]
  ): Promise<FileFlat> {
    return await FileRepository.update(fileId, { relatedNoteIds });
  }

  /**
   * ファイルのembeddingを更新（セマンティック検索用）
   *
   * @param fileId - ファイルID
   * @param embedding - embedding配列
   * @returns 更新されたファイル
   *
   * @example
   * await MetadataService.updateEmbedding('file-uuid-123', [0.1, 0.2, ...]);
   *
   * @remarks
   * 将来的なセマンティック検索機能で使用
   */
  static async updateEmbedding(
    fileId: string,
    embedding: number[]
  ): Promise<FileFlat> {
    return await FileRepository.update(fileId, { embedding });
  }
}
