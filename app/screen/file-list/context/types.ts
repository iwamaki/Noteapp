/**
 * @file types.ts
 * @summary FileListContext用の型定義
 */

import { File, Folder, FileSystemItem } from '@data/types';
import { TreeNode } from '../utils/treeUtils';

/**
 * 検索ターゲット
 */
export type SearchTarget = 'all' | 'files' | 'folders';

/**
 * 検索フィールド
 */
export type SearchField = 'title' | 'content' | 'all';

/**
 * 検索オプション
 */
export interface SearchOptions {
  target: SearchTarget;
  field: SearchField;
  caseSensitive: boolean;
}

/**
 * FileList画面の全体状態
 */
export interface FileListState {
  // データ
  folders: Folder[];
  files: File[];
  treeNodes: TreeNode[];

  // UI状態
  expandedFolderIds: Set<string>;
  loading: boolean;

  // 選択状態
  isSelectionMode: boolean;
  selectedFileIds: Set<string>;
  selectedFolderIds: Set<string>;

  // モーダル状態
  modals: {
    create: { visible: boolean };
    rename: { visible: boolean; item: FileSystemItem | null };
  };

  // 検索状態
  search: {
    isActive: boolean;
    query: string;
    options: SearchOptions;
  };

  // 移動モード
  isMoveMode: boolean;
}

/**
 * FileListアクション型
 */
export type FileListAction =
  // データ更新
  | { type: 'SET_DATA'; payload: { folders: Folder[]; files: File[] } }
  | { type: 'SET_LOADING'; payload: boolean }

  // ツリー操作
  | { type: 'TOGGLE_FOLDER'; payload: string }
  | { type: 'EXPAND_FOLDER'; payload: string }
  | { type: 'COLLAPSE_FOLDER'; payload: string }
  | { type: 'COLLAPSE_ALL_FOLDERS' }

  // 選択操作
  | { type: 'ENTER_SELECTION_MODE' }
  | { type: 'EXIT_SELECTION_MODE' }
  | { type: 'TOGGLE_SELECT_FILE'; payload: string }
  | { type: 'TOGGLE_SELECT_FOLDER'; payload: string }
  | { type: 'SELECT_ALL_VISIBLE' }
  | { type: 'CLEAR_SELECTION' }

  // モーダル操作
  | { type: 'OPEN_CREATE_MODAL' }
  | { type: 'CLOSE_CREATE_MODAL' }
  | { type: 'OPEN_RENAME_MODAL'; payload: FileSystemItem }
  | { type: 'CLOSE_RENAME_MODAL' }

  // 検索操作
  | {
      type: 'START_SEARCH';
      payload: { query: string; options: SearchOptions };
    }
  | { type: 'UPDATE_SEARCH_QUERY'; payload: string }
  | { type: 'UPDATE_SEARCH_OPTIONS'; payload: Partial<SearchOptions> }
  | { type: 'END_SEARCH' }

  // 移動モード
  | { type: 'ENTER_MOVE_MODE' }
  | { type: 'EXIT_MOVE_MODE' }

  // 複合操作
  | { type: 'REFRESH_COMPLETE'; payload: { folders: Folder[]; files: File[] } };
