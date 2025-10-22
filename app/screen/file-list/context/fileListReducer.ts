/**
 * @file fileListReducer.ts
 * @summary FileList画面の状態管理Reducer
 * @description
 * すべての状態遷移を一元管理し、予測可能な状態更新を保証します。
 */

import { FileListState, FileListAction } from './types';
import { buildTree } from '../utils/treeUtils';

/**
 * 初期状態
 */
export const createInitialState = (): FileListState => ({
  // データ
  folders: [],
  notes: [],
  treeNodes: [],

  // UI状態
  expandedFolderIds: new Set(),
  loading: false,

  // 選択状態
  isSelectionMode: false,
  selectedFileIds: new Set(),
  selectedFolderIds: new Set(),

  // モーダル状態
  modals: {
    create: { visible: false },
    rename: { visible: false, item: null },
  },

  // 検索状態
  search: {
    isActive: false,
    query: '',
    options: {
      target: 'all',
      field: 'title',
      caseSensitive: false,
    },
  },

  // 移動モード
  isMoveMode: false,
});

/**
 * NoteListReducer
 * すべての状態遷移を処理
 */
export function fileListReducer(
  state: FileListState,
  action: FileListAction
): FileListState {
  switch (action.type) {
    // ======================================
    // データ更新
    // ======================================
    case 'SET_DATA': {
      const { folders, notes } = action.payload;
      return {
        ...state,
        folders,
        notes,
        treeNodes: buildTree(folders, notes, state.expandedFolderIds),
      };
    }

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    // ======================================
    // ツリー操作
    // ======================================
    case 'TOGGLE_FOLDER': {
      const newExpanded = new Set(state.expandedFolderIds);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return {
        ...state,
        expandedFolderIds: newExpanded,
        treeNodes: buildTree(state.folders, state.notes, newExpanded),
      };
    }

    case 'EXPAND_FOLDER': {
      const newExpanded = new Set(state.expandedFolderIds);
      newExpanded.add(action.payload);
      return {
        ...state,
        expandedFolderIds: newExpanded,
        treeNodes: buildTree(state.folders, state.notes, newExpanded),
      };
    }

    case 'COLLAPSE_FOLDER': {
      const newExpanded = new Set(state.expandedFolderIds);
      newExpanded.delete(action.payload);
      return {
        ...state,
        expandedFolderIds: newExpanded,
        treeNodes: buildTree(state.folders, state.notes, newExpanded),
      };
    }

    case 'COLLAPSE_ALL_FOLDERS':
      return {
        ...state,
        expandedFolderIds: new Set(),
        treeNodes: buildTree(state.folders, state.notes, new Set()),
      };

    // ======================================
    // 選択操作
    // ======================================
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
        selectedFolderIds: new Set(),
      };

    case 'TOGGLE_SELECT_FILE': {
      const newSelected = new Set(state.selectedFileIds);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return {
        ...state,
        selectedFileIds: newSelected,
      };
    }

    case 'TOGGLE_SELECT_FOLDER': {
      const newSelected = new Set(state.selectedFolderIds);
      if (newSelected.has(action.payload)) {
        newSelected.delete(action.payload);
      } else {
        newSelected.add(action.payload);
      }
      return {
        ...state,
        selectedFolderIds: newSelected,
      };
    }

    case 'SELECT_ALL_VISIBLE': {
      // 現在表示されている全アイテムを選択
      const visibleFiles = new Set<string>();
      const visibleFolders = new Set<string>();

      const collectVisible = (nodes: typeof state.treeNodes) => {
        nodes.forEach(node => {
          if (node.type === 'file') {
            visibleFiles.add(node.id);
          } else {
            visibleFolders.add(node.id);
            if (node.isExpanded && node.children.length > 0) {
              collectVisible(node.children);
            }
          }
        });
      };

      collectVisible(state.treeNodes);

      return {
        ...state,
        selectedFileIds: visibleFiles,
        selectedFolderIds: visibleFolders,
      };
    }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedFileIds: new Set(),
        selectedFolderIds: new Set(),
      };

    // ======================================
    // モーダル操作
    // ======================================
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
          rename: { visible: true, item: action.payload },
        },
      };

    case 'CLOSE_RENAME_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          rename: { visible: false, item: null },
        },
      };

    // ======================================
    // 検索操作
    // ======================================
    case 'START_SEARCH':
      return {
        ...state,
        search: {
          isActive: true,
          query: action.payload.query,
          options: action.payload.options,
        },
      };

    case 'UPDATE_SEARCH_QUERY':
      return {
        ...state,
        search: {
          ...state.search,
          query: action.payload,
        },
      };

    case 'UPDATE_SEARCH_OPTIONS':
      return {
        ...state,
        search: {
          ...state.search,
          options: {
            ...state.search.options,
            ...action.payload,
          },
        },
      };

    case 'END_SEARCH':
      return {
        ...state,
        search: {
          isActive: false,
          query: '',
          options: {
            target: 'all',
            field: 'title',
            caseSensitive: false,
          },
        },
      };

    // ======================================
    // 移動モード
    // ======================================
    case 'ENTER_MOVE_MODE':
      return {
        ...state,
        isMoveMode: true,
      };

    case 'EXIT_MOVE_MODE':
      return {
        ...state,
        isMoveMode: false,
      };

    // ======================================
    // 複合操作
    // ======================================
    case 'REFRESH_COMPLETE': {
      const { folders, notes } = action.payload;
      // 全状態をリセットしながら、データのみ更新
      return {
        ...state,
        folders,
        notes,
        treeNodes: buildTree(folders, notes, state.expandedFolderIds),
        loading: false,

        // 選択状態はクリア
        isSelectionMode: false,
        selectedFileIds: new Set(),
        selectedFolderIds: new Set(),

        // モーダルは閉じる
        modals: {
          create: { visible: false },
          rename: { visible: false, item: null },
        },

        // 移動モードは解除
        isMoveMode: false,
      };
    }

    default:
      return state;
  }
}
