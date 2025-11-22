/**
 * @file stores/useFlatListStore.ts
 * @summary フラットリスト用のZustand Store
 * @description
 * Context + Reducer から Zustand への移行版。
 * 状態管理とアクションを一元化し、シンプルで高パフォーマンスな実装を実現。
 */

import { create } from 'zustand';
import { Alert } from 'react-native';
import { FileFlat } from '@data/core/typesFlat';
import { FileListUseCasesFlat } from '../application/FileListUseCasesFlat';
import { logger } from '../../../utils/logger';

// =============================================================================
// Types
// =============================================================================

/**
 * フラットリストの状態
 */
interface FlatListState {
  // データ
  files: FileFlat[];
  loading: boolean;
  error: string | null;

  // 選択状態
  selectedFileIds: Set<string>;
  isSelectionMode: boolean;

  // 移動モード
  isMoveMode: boolean;
  moveSourceFileId: string | null;
  moveSourceCategoryPath: string | null;

  // フィルタリング・検索
  searchQuery: string;
  selectedCategories: string[];
  selectedTags: string[];

  // モーダル状態
  modals: {
    create: {
      visible: boolean;
    };
    rename: {
      visible: boolean;
      file: FileFlat | null;
    };
    delete: {
      visible: boolean;
    };
  };
}

/**
 * アクション関数の型定義
 */
interface FlatListActions {
  // データ操作
  refreshData: () => Promise<void>;
  createFile: (title: string, content?: string, category?: string, tags?: string[]) => Promise<FileFlat>;
  renameFile: (fileId: string, newTitle: string) => Promise<void>;
  deleteSelectedFiles: (fileIds: string[]) => Promise<void>;
  copySelectedFiles: (fileIds: string[]) => Promise<void>;

  // メタデータ操作
  updateFileCategory: (fileId: string, category: string) => Promise<void>;
  updateFileTags: (fileId: string, tags: string[]) => Promise<void>;
  reorderFiles: (reorderedFiles: FileFlat[]) => Promise<void>;
  moveFile: (sourceFileId: string, targetCategoryPath: string, targetIndex?: number) => Promise<void>;

  // フィルタリング
  filterByCategory: (categoryName: string) => Promise<void>;
  filterByTag: (tagName: string) => Promise<void>;
  search: (query: string) => void;
  clearFilters: () => void;

  // 選択操作
  toggleSelectFile: (fileId: string) => void;
  selectAllFiles: () => void;
  deselectAllFiles: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;

  // 移動モード
  enterMoveMode: (categoryPath: string) => void;
  exitMoveMode: () => void;
  selectMoveSource: (fileId: string) => void;
  clearMoveSource: () => void;

  // モーダル操作
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openRenameModal: (file: FileFlat) => void;
  closeRenameModal: () => void;
  openDeleteModal: () => void;
  closeDeleteModal: () => void;

  // 状態操作
  setFiles: (files: FileFlat[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addFile: (file: FileFlat) => void;
  updateFile: (file: FileFlat) => void;
  removeFile: (fileId: string) => void;
}

/**
 * ストアの型定義
 */
type FlatListStore = FlatListState & FlatListActions;

// =============================================================================
// Store
// =============================================================================

/**
 * フラットリスト用のZustand Store
 */
export const useFlatListStore = create<FlatListStore>((set, get) => ({
  // ===== 初期状態 =====
  files: [],
  loading: false,
  error: null,

  selectedFileIds: new Set(),
  isSelectionMode: false,

  isMoveMode: false,
  moveSourceFileId: null,
  moveSourceCategoryPath: null,

  searchQuery: '',
  selectedCategories: [],
  selectedTags: [],

  modals: {
    create: { visible: false },
    rename: { visible: false, file: null },
    delete: { visible: false },
  },

  // ===== データ操作 =====

  /**
   * データを再取得
   */
  refreshData: async () => {
    const startTime = Date.now();
    try {
      set({ loading: true, error: null });
      logger.info('init', '📁 Starting file data load...');

      const files = await FileListUseCasesFlat.getAllFiles();
      const duration = Date.now() - startTime;
      logger.info('init', `📁 File data loaded: ${files.length} files in ${duration}ms`);

      set({ files });
    } catch (error: any) {
      logger.error('file', `Failed to refresh data: ${error.message}`, error);
      set({ error: error.message });
      Alert.alert('エラー', 'データの読み込みに失敗しました');
    } finally {
      set({ loading: false });
      const totalDuration = Date.now() - startTime;
      logger.info('init', `📁 File data load completed in ${totalDuration}ms (including state update)`);
    }
  },

  /**
   * ファイルを作成
   */
  createFile: async (title: string, content: string = '', category: string = '', tags: string[] = []): Promise<FileFlat> => {
    try {
      logger.info('file', `Creating file: ${title}`);

      const file = await FileListUseCasesFlat.createFile(title, content, category, tags);
      logger.info('file', `File created: ${file.id}`);

      // 状態に追加
      set((state) => ({
        files: [...state.files, file],
      }));

      return file;
    } catch (error: any) {
      logger.error('file', `Failed to create file: ${error.message}`, error);
      throw error;
    }
  },

  /**
   * ファイルをリネーム
   */
  renameFile: async (fileId: string, newTitle: string) => {
    try {
      logger.info('file', `Renaming file ${fileId} to ${newTitle}`);

      const updatedFile = await FileListUseCasesFlat.renameFile(fileId, newTitle);
      logger.info('file', `File renamed: ${fileId}`);

      // 状態を更新
      set((state) => ({
        files: state.files.map((file) => (file.id === updatedFile.id ? updatedFile : file)),
      }));
    } catch (error: any) {
      logger.error('file', `Failed to rename file: ${error.message}`, error);
      throw error;
    }
  },

  /**
   * 選択されたファイルを削除
   */
  deleteSelectedFiles: async (fileIds: string[]) => {
    try {
      logger.info('file', `Deleting ${fileIds.length} files`);

      await FileListUseCasesFlat.deleteSelectedFiles(fileIds);
      logger.info('file', `Files deleted: ${fileIds.length}`);

      // 状態から削除
      set((state) => ({
        files: state.files.filter((file) => !fileIds.includes(file.id)),
        selectedFileIds: new Set(
          Array.from(state.selectedFileIds).filter((id) => !fileIds.includes(id))
        ),
        isSelectionMode: false,
      }));
    } catch (error: any) {
      logger.error('file', `Failed to delete files: ${error.message}`, error);
      throw error;
    }
  },

  /**
   * 選択されたファイルをコピー
   */
  copySelectedFiles: async (fileIds: string[]) => {
    try {
      logger.info('file', `Copying ${fileIds.length} files`);

      const copiedFiles = await FileListUseCasesFlat.copyFiles(fileIds);
      logger.info('file', `Files copied: ${copiedFiles.length}`);

      // 状態に追加
      set((state) => ({
        files: [...state.files, ...copiedFiles],
        isSelectionMode: false,
      }));
    } catch (error: any) {
      logger.error('file', `Failed to copy files: ${error.message}`, error);
      throw error;
    }
  },

  // ===== メタデータ操作 =====

  /**
   * ファイルのカテゴリーを更新
   */
  updateFileCategory: async (fileId: string, category: string) => {
    try {
      logger.info('file', `Updating category for file ${fileId}`);

      const updatedFile = await FileListUseCasesFlat.updateFileCategory(fileId, category);
      logger.info('file', `Category updated for file ${fileId}`);

      // 状態を更新
      set((state) => ({
        files: state.files.map((file) => (file.id === updatedFile.id ? updatedFile : file)),
      }));
    } catch (error: any) {
      logger.error('file', `Failed to update category: ${error.message}`, error);
      throw error;
    }
  },

  /**
   * ファイルのタグを更新
   */
  updateFileTags: async (fileId: string, tags: string[]) => {
    try {
      logger.info('file', `Updating tags for file ${fileId}`);

      const updatedFile = await FileListUseCasesFlat.updateFileTags(fileId, tags);
      logger.info('file', `Tags updated for file ${fileId}`);

      // 状態を更新
      set((state) => ({
        files: state.files.map((file) => (file.id === updatedFile.id ? updatedFile : file)),
      }));
    } catch (error: any) {
      logger.error('file', `Failed to update tags: ${error.message}`, error);
      throw error;
    }
  },

  /**
   * ファイルの並び順を更新
   */
  reorderFiles: async (reorderedFiles: FileFlat[]) => {
    try {
      logger.info('file', `Reordering ${reorderedFiles.length} files`);

      const updatedFiles = await FileListUseCasesFlat.reorderFiles(reorderedFiles);
      logger.info('file', `Files reordered: ${updatedFiles.length}`);

      // 状態を更新
      set((state) => {
        const filesMap = new Map(state.files.map((f) => [f.id, f]));
        updatedFiles.forEach((f) => filesMap.set(f.id, f));
        return { files: Array.from(filesMap.values()) };
      });
    } catch (error: any) {
      logger.error('file', `Failed to reorder files: ${error.message}`, error);
      throw error;
    }
  },

  /**
   * ファイルを移動（カテゴリー変更 + 並び順指定）
   */
  moveFile: async (sourceFileId: string, targetCategoryPath: string, targetIndex?: number) => {
    try {
      const { files } = get();
      logger.info('file', `Moving file ${sourceFileId} to category ${targetCategoryPath} at index ${targetIndex ?? 'end'}`);

      // ファイルを取得
      const sourceFile = files.find((f) => f.id === sourceFileId);
      if (!sourceFile) {
        throw new Error(`Source file not found: ${sourceFileId}`);
      }

      // カテゴリーが変わる場合はカテゴリーを更新
      if (sourceFile.category !== targetCategoryPath) {
        await FileListUseCasesFlat.updateFileCategory(sourceFileId, targetCategoryPath);
      }

      // targetIndexが指定されている場合は、そのカテゴリー内での並び順を更新
      if (targetIndex !== undefined) {
        // 対象カテゴリーのファイルを取得
        const categoryFiles = files
          .filter((f) => f.category === targetCategoryPath)
          .sort((a, b) => {
            const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) return orderA - orderB;
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          });

        // 移動元ファイルを除外（カテゴリーが同じ場合）
        const filesWithoutSource = categoryFiles.filter((f) => f.id !== sourceFileId);

        // targetIndexの位置に挿入
        filesWithoutSource.splice(targetIndex, 0, { ...sourceFile, category: targetCategoryPath });

        // orderを振り直し
        const filesWithOrder = filesWithoutSource.map((f, i) => ({ ...f, order: i }));

        await FileListUseCasesFlat.reorderFiles(filesWithOrder);
      }

      logger.info('file', `File moved successfully`);

      // データを再読み込み
      await get().refreshData();
    } catch (error: any) {
      logger.error('file', `Failed to move file: ${error.message}`, error);
      throw error;
    }
  },

  // ===== フィルタリング =====

  /**
   * カテゴリーでフィルタリング
   */
  filterByCategory: async (categoryName: string) => {
    try {
      set({ loading: true });
      logger.info('file', `Filtering by category: ${categoryName}`);

      const files = await FileListUseCasesFlat.getFilesByCategory(categoryName);
      logger.info('file', `Filtered ${files.length} files by category`);

      set({ files, selectedCategories: [categoryName] });
    } catch (error: any) {
      logger.error('file', `Failed to filter by category: ${error.message}`, error);
      Alert.alert('エラー', 'カテゴリーフィルタリングに失敗しました');
    } finally {
      set({ loading: false });
    }
  },

  /**
   * タグでフィルタリング
   */
  filterByTag: async (tagName: string) => {
    try {
      set({ loading: true });
      logger.info('file', `Filtering by tag: ${tagName}`);

      const files = await FileListUseCasesFlat.getFilesByTag(tagName);
      logger.info('file', `Filtered ${files.length} files by tag`);

      set({ files, selectedTags: [tagName] });
    } catch (error: any) {
      logger.error('file', `Failed to filter by tag: ${error.message}`, error);
      Alert.alert('エラー', 'タグフィルタリングに失敗しました');
    } finally {
      set({ loading: false });
    }
  },

  /**
   * 検索
   */
  search: (query: string) => {
    set({ searchQuery: query });
  },

  /**
   * フィルターをクリア
   */
  clearFilters: () => {
    set({ searchQuery: '', selectedCategories: [], selectedTags: [] });
    get().refreshData();
  },

  // ===== 選択操作 =====

  /**
   * ファイル選択のトグル
   */
  toggleSelectFile: (fileId: string) => {
    set((state) => {
      const newSet = new Set(state.selectedFileIds);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return { selectedFileIds: newSet };
    });
  },

  /**
   * 全ファイルを選択
   */
  selectAllFiles: () => {
    set((state) => ({
      selectedFileIds: new Set(state.files.map((file) => file.id)),
    }));
  },

  /**
   * 全ファイルの選択を解除
   */
  deselectAllFiles: () => {
    set({ selectedFileIds: new Set() });
  },

  /**
   * 選択モードに入る
   */
  enterSelectionMode: () => {
    set({ isSelectionMode: true });
  },

  /**
   * 選択モードを終了
   */
  exitSelectionMode: () => {
    set({ isSelectionMode: false, selectedFileIds: new Set() });
  },

  // ===== 移動モード =====

  /**
   * 移動モードに入る
   */
  enterMoveMode: (categoryPath: string) => {
    set({
      isMoveMode: true,
      moveSourceCategoryPath: categoryPath,
      moveSourceFileId: null,
    });
  },

  /**
   * 移動モードを終了
   */
  exitMoveMode: () => {
    set({
      isMoveMode: false,
      moveSourceCategoryPath: null,
      moveSourceFileId: null,
    });
  },

  /**
   * 移動元ファイルを選択
   */
  selectMoveSource: (fileId: string) => {
    set({ moveSourceFileId: fileId });
  },

  /**
   * 移動元ファイルをクリア
   */
  clearMoveSource: () => {
    set({ moveSourceFileId: null });
  },

  // ===== モーダル操作 =====

  /**
   * 作成モーダルを開く
   */
  openCreateModal: () => {
    set((state) => ({
      modals: {
        ...state.modals,
        create: { visible: true },
      },
    }));
  },

  /**
   * 作成モーダルを閉じる
   */
  closeCreateModal: () => {
    set((state) => ({
      modals: {
        ...state.modals,
        create: { visible: false },
      },
    }));
  },

  /**
   * リネームモーダルを開く
   */
  openRenameModal: (file: FileFlat) => {
    set((state) => ({
      modals: {
        ...state.modals,
        rename: { visible: true, file },
      },
    }));
  },

  /**
   * リネームモーダルを閉じる
   */
  closeRenameModal: () => {
    set((state) => ({
      modals: {
        ...state.modals,
        rename: { visible: false, file: null },
      },
    }));
  },

  /**
   * 削除モーダルを開く
   */
  openDeleteModal: () => {
    set((state) => ({
      modals: {
        ...state.modals,
        delete: { visible: true },
      },
    }));
  },

  /**
   * 削除モーダルを閉じる
   */
  closeDeleteModal: () => {
    set((state) => ({
      modals: {
        ...state.modals,
        delete: { visible: false },
      },
    }));
  },

  // ===== 状態操作（内部用） =====

  /**
   * ファイルリストを設定
   */
  setFiles: (files: FileFlat[]) => {
    set({ files });
  },

  /**
   * ローディング状態を設定
   */
  setLoading: (loading: boolean) => {
    set({ loading });
  },

  /**
   * エラーを設定
   */
  setError: (error: string | null) => {
    set({ error });
  },

  /**
   * ファイルを追加
   */
  addFile: (file: FileFlat) => {
    set((state) => ({
      files: [...state.files, file],
    }));
  },

  /**
   * ファイルを更新
   */
  updateFile: (file: FileFlat) => {
    set((state) => ({
      files: state.files.map((f) => (f.id === file.id ? file : f)),
    }));
  },

  /**
   * ファイルを削除
   */
  removeFile: (fileId: string) => {
    set((state) => ({
      files: state.files.filter((f) => f.id !== fileId),
      selectedFileIds: new Set(
        Array.from(state.selectedFileIds).filter((id) => id !== fileId)
      ),
    }));
  },
}));
