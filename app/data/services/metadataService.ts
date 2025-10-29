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
  FileCategorySection,
  FileCategorySectionHierarchical,
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
   * @param categoryPath - カテゴリーパス（例: "研究/AI"）
   * @returns カテゴリーに属するファイルの配列
   *
   * @example
   * const files = await MetadataService.getByCategory('研究/AI');
   *
   * @remarks
   * 完全一致で検索。階層の途中まで（例: "研究"）を指定した場合は、
   * そのカテゴリー直属のファイルのみが返される。
   */
  static async getByCategory(categoryPath: string): Promise<FileFlat[]> {
    const allFiles = await FileRepository.getAll();
    return allFiles.filter((file) => file.category === categoryPath);
  }

  /**
   * 指定されたカテゴリー配下のファイルをすべて取得（サブカテゴリーも含む）
   *
   * @param categoryPath - カテゴリーパス（例: "研究"）
   * @returns カテゴリー配下のすべてのファイルの配列
   *
   * @example
   * const files = await MetadataService.getByCategoryRecursive('研究');
   * // "研究", "研究/AI", "研究/AI/深層学習" などすべてを含む
   */
  static async getByCategoryRecursive(categoryPath: string): Promise<FileFlat[]> {
    const allFiles = await FileRepository.getAll();
    return allFiles.filter((file) =>
      file.category === categoryPath || file.category.startsWith(categoryPath + '/')
    );
  }

  /**
   * 全カテゴリーの統計情報を取得
   *
   * @returns カテゴリー情報の配列（ファイル数でソート）
   *
   * @example
   * const categories = await MetadataService.getAllCategories();
   * // => [{ name: '研究/AI', fileCount: 15 }, { name: '個人', fileCount: 8 }, ...]
   *
   * @remarks
   * UI表示用（カテゴリービュー、サイドバーなど）
   * 階層パス全体をカテゴリー名として返す
   */
  static async getAllCategories(): Promise<CategoryInfo[]> {
    const allFiles = await FileRepository.getAll();

    // カテゴリーごとのファイル数をカウント
    const categoryMap = new Map<string, number>();

    for (const file of allFiles) {
      if (file.category) {
        const count = categoryMap.get(file.category) || 0;
        categoryMap.set(file.category, count + 1);
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

  /**
   * ファイルをカテゴリーでグループ化（フラット構造）
   *
   * @returns カテゴリー別のファイルセクション配列
   *
   * @example
   * const sections = await MetadataService.groupFilesByCategory();
   * // => [
   * //   { category: '研究/AI', fileCount: 5, files: [...] },
   * //   { category: '個人', fileCount: 3, files: [...] },
   * //   { category: '未分類', fileCount: 2, files: [...] }
   * // ]
   *
   * @remarks
   * - カテゴリーを持たないファイルは「未分類」セクションに表示
   * - セクションはファイル数の多い順にソート（「未分類」は常に最後）
   * - Phase 1実装：フラットなグルーピングのみ（階層構造なし）
   */
  static async groupFilesByCategory(): Promise<FileCategorySection[]> {
    const allFiles = await FileRepository.getAll();

    // カテゴリーごとにファイルをグループ化
    const categoryMap = new Map<string, FileFlat[]>();
    const uncategorizedKey = '未分類';

    for (const file of allFiles) {
      const category = file.category || uncategorizedKey;
      const files = categoryMap.get(category) || [];
      files.push(file);
      categoryMap.set(category, files);
    }

    // FileCategorySection配列に変換
    const sections: FileCategorySection[] = Array.from(
      categoryMap.entries()
    ).map(([category, files]) => ({
      category,
      fileCount: files.length,
      files,
    }));

    // ソート：「未分類」以外はファイル数の多い順、「未分類」は常に最後
    return sections.sort((a, b) => {
      if (a.category === uncategorizedKey) return 1;
      if (b.category === uncategorizedKey) return -1;
      return b.fileCount - a.fileCount;
    });
  }

  /**
   * ファイルをカテゴリーでグループ化（階層構造対応）
   *
   * @returns 階層構造を持つカテゴリー別のファイルセクション配列
   *
   * @example
   * const sections = await MetadataService.groupFilesByCategoryHierarchical();
   * // => [
   * //   { category: '研究', fullPath: '研究', level: 0, parent: null, fileCount: 5, directFiles: [研究プロジェクト概要] },
   * //   { category: 'AI', fullPath: '研究/AI', level: 1, parent: '研究', fileCount: 2, directFiles: [機械学習論文メモ, AI倫理] },
   * //   { category: 'データ分析', fullPath: '研究/データ分析', level: 1, parent: '研究', fileCount: 2, directFiles: [...] },
   * //   { category: '個人', fullPath: '個人', level: 0, parent: null, fileCount: 1, directFiles: [...] },
   * //   { category: '未分類', fullPath: '未分類', level: 0, parent: null, fileCount: 1, directFiles: [...] }
   * // ]
   *
   * @remarks
   * - カテゴリー名に "/" を含む場合、階層構造として解釈（例: "研究/AI"）
   * - 親カテゴリーは自動生成（"研究/AI" があれば "研究" も存在）
   * - fileCount は直接属するファイル + 子孫カテゴリーのファイル総数
   * - directFiles は直接そのカテゴリーに属するファイルのみ
   * - ソート順: 親カテゴリー → サブカテゴリー（各階層内でfileCount降順）
   * - 「未分類」は常に最後
   * - Phase 2A実装：階層表示（展開固定）
   */
  static async groupFilesByCategoryHierarchical(): Promise<FileCategorySectionHierarchical[]> {
    const allFiles = await FileRepository.getAll();
    const uncategorizedKey = '未分類';

    // Step 1: カテゴリー情報を収集・解析
    interface CategoryNode {
      fullPath: string;
      level: number;
      parent: string | null;
      directFileIds: Set<string>;
      childPaths: Set<string>;
    }

    const categoryNodes = new Map<string, CategoryNode>();

    // カテゴリーノードを作成（親カテゴリーも自動生成）
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

    // Step 2: ファイルをカテゴリーに振り分け
    const fileMap = new Map<string, FileFlat>();
    for (const file of allFiles) {
      fileMap.set(file.id, file);

      const category = file.category || uncategorizedKey;
      ensureCategoryNode(category);
      categoryNodes.get(category)!.directFileIds.add(file.id);
    }

    // Step 3: 各カテゴリーの総ファイル数を計算（子孫も含む）
    const calculateTotalFileCount = (fullPath: string): number => {
      const node = categoryNodes.get(fullPath);
      if (!node) return 0;

      let total = node.directFileIds.size;
      for (const childPath of node.childPaths) {
        total += calculateTotalFileCount(childPath);
      }
      return total;
    };

    // Step 4: FileCategorySectionHierarchical配列に変換
    const sections: FileCategorySectionHierarchical[] = [];

    for (const [fullPath, node] of categoryNodes.entries()) {
      const parts = fullPath.split('/');
      const category = parts[parts.length - 1];
      const fileCount = calculateTotalFileCount(fullPath);
      const directFiles = Array.from(node.directFileIds)
        .map(id => fileMap.get(id)!)
        .filter(Boolean);

      sections.push({
        category,
        fullPath,
        level: node.level,
        parent: node.parent,
        fileCount,
        directFiles,
      });
    }

    // Step 5: ソート
    // - 未分類は最後
    // - 同じ親を持つカテゴリー同士でfileCount降順
    // - 親カテゴリーの直後にその子カテゴリーが続く
    const sortedSections: FileCategorySectionHierarchical[] = [];
    const added = new Set<string>();

    const addCategoryAndChildren = (fullPath: string) => {
      if (added.has(fullPath)) return;

      const section = sections.find(s => s.fullPath === fullPath);
      if (!section) return;

      sortedSections.push(section);
      added.add(fullPath);

      // 子カテゴリーを取得してソート（fileCount降順）
      const children = sections
        .filter(s => s.parent === fullPath)
        .sort((a, b) => b.fileCount - a.fileCount);

      for (const child of children) {
        addCategoryAndChildren(child.fullPath);
      }
    };

    // ルートカテゴリー（parent === null）から開始
    const rootCategories = sections
      .filter(s => s.parent === null && s.fullPath !== uncategorizedKey)
      .sort((a, b) => b.fileCount - a.fileCount);

    for (const root of rootCategories) {
      addCategoryAndChildren(root.fullPath);
    }

    // 未分類を最後に追加
    const uncategorizedSection = sections.find(s => s.fullPath === uncategorizedKey);
    if (uncategorizedSection) {
      sortedSections.push(uncategorizedSection);
    }

    return sortedSections;
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
   * // カテゴリー「研究/AI」かつタグ「重要」を持つファイル
   * const files = await MetadataService.searchByMetadata({
   *   category: '研究/AI',
   *   tags: ['重要'],
   * });
   *
   * // テキスト検索も含む
   * const files2 = await MetadataService.searchByMetadata({
   *   category: '研究',
   *   searchText: 'machine learning',
   * });
   *
   * @remarks
   * - category: 完全一致検索（指定されたカテゴリーに属する）
   * - tags: OR検索（いずれかのタグを持つ）
   * - searchText: タイトルと内容で部分一致検索
   * - 各条件はANDで結合される
   */
  static async searchByMetadata(
    options: MetadataSearchOptions
  ): Promise<FileFlat[]> {
    let results = await FileRepository.getAll();

    // カテゴリーフィルター（完全一致）
    if (options.category) {
      results = results.filter((file) => file.category === options.category);
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
   * @param category - 新しいカテゴリーパス（例: "研究/AI"）
   * @returns 更新されたファイル
   *
   * @example
   * await MetadataService.updateCategory('file-uuid-123', '研究/AI');
   */
  static async updateCategory(
    fileId: string,
    category: string
  ): Promise<FileFlat> {
    return await FileRepository.update(fileId, { category });
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
