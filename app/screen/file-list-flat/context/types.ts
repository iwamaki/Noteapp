/**
 * @file types.ts
 * @summary フラットリスト用の型定義
 * @description
 * フォルダ構造を排除した、シンプルな状態管理の型定義。
 * 既存のfile-list/context/types.tsから大幅に簡素化。
 */

import { FileFlat } from '@data/core/typesFlat';

// =============================================================================
// State Types
// =============================================================================

/**
 * フラットリストの状態
 *
 * 既存のFileListStateから削除した要素：
 * - folders, treeNodes, expandedFolderIds, folderPaths
 * - isMoveMode, selectedFolderIds
 * - modals.folder
 */
export interface FlatListState {
  // データ
  files: FileFlat[];
  loading: boolean;
  error: string | null;

  // 選択状態
  selectedFileIds: Set<string>;
  isSelectionMode: boolean;

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

// =============================================================================
// Action Types
// =============================================================================

export type FlatListAction =
  // データ操作
  | { type: 'SET_FILES'; payload: FileFlat[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_FILE'; payload: FileFlat }
  | { type: 'UPDATE_FILE'; payload: FileFlat }
  | { type: 'REMOVE_FILE'; payload: string }

  // 選択操作
  | { type: 'TOGGLE_SELECT_FILE'; payload: string }
  | { type: 'SELECT_ALL_FILES' }
  | { type: 'DESELECT_ALL_FILES' }
  | { type: 'ENTER_SELECTION_MODE' }
  | { type: 'EXIT_SELECTION_MODE' }

  // フィルタリング・検索
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_CATEGORIES'; payload: string[] }
  | { type: 'SET_SELECTED_TAGS'; payload: string[] }
  | { type: 'CLEAR_FILTERS' }

  // モーダル操作
  | { type: 'OPEN_CREATE_MODAL' }
  | { type: 'CLOSE_CREATE_MODAL' }
  | { type: 'OPEN_RENAME_MODAL'; payload: FileFlat }
  | { type: 'CLOSE_RENAME_MODAL' }
  | { type: 'OPEN_DELETE_MODAL' }
  | { type: 'CLOSE_DELETE_MODAL' };

// =============================================================================
// Context Types
// =============================================================================

/**
 * フラットリストのコンテキスト型
 */
export interface FlatListContextType {
  state: FlatListState;
  dispatch: React.Dispatch<FlatListAction>;
  actions: FlatListActions;
}

/**
 * アクション関数の型定義
 */
export interface FlatListActions {
  // データ操作
  refreshData: () => Promise<void>;
  createFile: (title: string, content?: string, categories?: string[], tags?: string[]) => Promise<FileFlat>;
  renameFile: (fileId: string, newTitle: string) => Promise<void>;
  deleteSelectedFiles: (fileIds: string[]) => Promise<void>;
  copySelectedFiles: (fileIds: string[]) => Promise<void>;

  // メタデータ操作
  updateFileCategories: (fileId: string, categories: string[]) => Promise<void>;
  updateFileTags: (fileId: string, tags: string[]) => Promise<void>;

  // フィルタリング
  filterByCategory: (categoryName: string) => Promise<void>;
  filterByTag: (tagName: string) => Promise<void>;
  search: (query: string) => void;
  clearFilters: () => void;
}
