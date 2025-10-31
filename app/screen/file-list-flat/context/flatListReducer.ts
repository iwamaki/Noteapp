/**
 * @file flatListReducer.ts
 * @summary フラットリスト用のReducer
 * @description
 * フォルダ構造を排除した、シンプルな状態管理。
 * 既存のfileListReducerから大幅に簡素化。
 */

import { FlatListState, FlatListAction } from './types';

/**
 * 初期状態
 */
export const initialFlatListState: FlatListState = {
  // データ
  files: [],
  loading: false,
  error: null,

  // 選択状態
  selectedFileIds: new Set(),
  isSelectionMode: false,

  // 並び替えモード
  isReorderMode: false,
  reorderSourceFileId: null,
  reorderCategoryPath: null,

  // フィルタリング・検索
  searchQuery: '',
  selectedCategories: [],
  selectedTags: [],

  // モーダル状態
  modals: {
    create: { visible: false },
    rename: { visible: false, file: null },
    delete: { visible: false },
  },
};

/**
 * フラットリストReducer
 *
 * 既存のfileListReducerから削除した機能：
 * - フォルダ関連の状態管理
 * - ツリー構造の構築
 * - 移動モード
 */
export function flatListReducer(
  state: FlatListState,
  action: FlatListAction
): FlatListState {
  switch (action.type) {
    // =============================================================================
    // データ操作
    // =============================================================================
    case 'SET_FILES':
      return {
        ...state,
        files: action.payload,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'ADD_FILE':
      return {
        ...state,
        files: [...state.files, action.payload],
      };

    case 'UPDATE_FILE':
      return {
        ...state,
        files: state.files.map((file) =>
          file.id === action.payload.id ? action.payload : file
        ),
      };

    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter((file) => file.id !== action.payload),
        selectedFileIds: new Set(
          Array.from(state.selectedFileIds).filter((id) => id !== action.payload)
        ),
      };

    // =============================================================================
    // 選択操作
    // =============================================================================
    case 'TOGGLE_SELECT_FILE': {
      const newSet = new Set(state.selectedFileIds);
      if (newSet.has(action.payload)) {
        newSet.delete(action.payload);
      } else {
        newSet.add(action.payload);
      }
      return {
        ...state,
        selectedFileIds: newSet,
      };
    }

    case 'SELECT_ALL_FILES':
      return {
        ...state,
        selectedFileIds: new Set(state.files.map((file) => file.id)),
      };

    case 'DESELECT_ALL_FILES':
      return {
        ...state,
        selectedFileIds: new Set(),
      };

    case 'ENTER_SELECTION_MODE':
      return {
        ...state,
        isSelectionMode: true,
      };

    case 'EXIT_SELECTION_MODE':
      return {
        ...state,
        isSelectionMode: false,
        selectedFileIds: new Set(),
      };

    // =============================================================================
    // 並び替えモード
    // =============================================================================
    case 'ENTER_REORDER_MODE':
      return {
        ...state,
        isReorderMode: true,
        reorderCategoryPath: action.payload,
        reorderSourceFileId: null,
      };

    case 'EXIT_REORDER_MODE':
      return {
        ...state,
        isReorderMode: false,
        reorderCategoryPath: null,
        reorderSourceFileId: null,
      };

    case 'SELECT_REORDER_SOURCE':
      return {
        ...state,
        reorderSourceFileId: action.payload,
      };

    case 'CLEAR_REORDER_SOURCE':
      return {
        ...state,
        reorderSourceFileId: null,
      };

    // =============================================================================
    // フィルタリング・検索
    // =============================================================================
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      };

    case 'SET_SELECTED_CATEGORIES':
      return {
        ...state,
        selectedCategories: action.payload,
      };

    case 'SET_SELECTED_TAGS':
      return {
        ...state,
        selectedTags: action.payload,
      };

    case 'CLEAR_FILTERS':
      return {
        ...state,
        searchQuery: '',
        selectedCategories: [],
        selectedTags: [],
      };

    // =============================================================================
    // モーダル操作
    // =============================================================================
    case 'OPEN_CREATE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          create: { visible: true },
        },
      };

    case 'CLOSE_CREATE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          create: { visible: false },
        },
      };

    case 'OPEN_RENAME_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          rename: { visible: true, file: action.payload },
        },
      };

    case 'CLOSE_RENAME_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          rename: { visible: false, file: null },
        },
      };

    case 'OPEN_DELETE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          delete: { visible: true },
        },
      };

    case 'CLOSE_DELETE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          delete: { visible: false },
        },
      };

    default:
      return state;
  }
}
