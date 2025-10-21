/**
 * @file NoteListContext.tsx
 * @summary NoteList画面の状態管理Context
 */

import React from 'react';
import { NoteListState, NoteListAction } from './types';
import { Note, Folder, FileSystemItem } from '@shared/types/note';

/**
 * 非同期アクションヘルパーの型定義
 */
export interface NoteListActions {
  /**
   * データを再取得してリフレッシュ
   */
  refreshData: () => Promise<void>;

  /**
   * フォルダをリネーム
   */
  renameFolder: (folderId: string, newName: string) => Promise<void>;

  /**
   * ノートをリネーム
   */
  renameNote: (noteId: string, newTitle: string) => Promise<void>;

  /**
   * 選択されたアイテムを削除
   */
  deleteSelectedItems: (noteIds: string[], folderIds: string[]) => Promise<void>;

  /**
   * 選択されたアイテムを移動
   */
  moveSelectedItems: (
    noteIds: string[],
    folderIds: string[],
    targetPath: string
  ) => Promise<void>;

  /**
   * フォルダを作成
   */
  createFolder: (name: string, parentPath: string) => Promise<Folder>;

  /**
   * ノートをパス指定で作成
   */
  createNoteWithPath: (
    inputPath: string,
    content?: string,
    tags?: string[]
  ) => Promise<Note>;

  /**
   * 選択されたノートをコピー
   */
  copySelectedNotes: (noteIds: string[]) => Promise<Note[]>;
}

/**
 * Contextの値の型
 */
export interface NoteListContextValue {
  state: NoteListState;
  dispatch: React.Dispatch<NoteListAction>;
  actions: NoteListActions;
  /**
   * folders + notesの統合リスト（派生値）
   */
  items: FileSystemItem[];
}

/**
 * NoteListContext
 */
export const NoteListContext = React.createContext<NoteListContextValue | undefined>(
  undefined
);
