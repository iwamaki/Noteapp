/**
 * @file FileListContext.tsx
 * @summary FileList画面の状態管理Context
 */

import React from 'react';
import { FileListState, FileListAction } from './types';
import { File, Folder, FileSystemItem } from '@data/types';

/**
 * 非同期アクションヘルパーの型定義
 */
export interface FileListActions {
  /**
   * データを再取得してリフレッシュ
   */
  refreshData: () => Promise<void>;

  /**
   * フォルダの子アイテムを読み込む（遅延読み込み）
   */
  loadFolderChildren: (folderId: string, folderPath: string) => Promise<void>;

  /**
   * フォルダをリネーム
   */
  renameFolder: (folderId: string, newName: string) => Promise<void>;

  /**
   * ファイルをリネーム
   */
  renameFile: (fileId: string, newTitle: string) => Promise<void>;

  /**
   * 選択されたアイテムを削除
   */
  deleteSelectedItems: (fileIds: string[], folderIds: string[]) => Promise<void>;

  /**
   * 選択されたアイテムを移動
   */
  moveSelectedItems: (
    fileIds: string[],
    folderIds: string[],
    targetPath: string
  ) => Promise<void>;

  /**
   * フォルダを作成
   */
  createFolder: (name: string, parentPath: string) => Promise<Folder>;

  /**
   * ファイルをパス指定で作成
   */
  createFileWithPath: (
    inputPath: string,
    content?: string,
    tags?: string[]
  ) => Promise<File>;

  /**
   * 選択されたファイルをコピー
   */
  copySelectedFiles: (fileIds: string[]) => Promise<File[]>;
}

/**
 * Contextの値の型
 */
export interface FileListContextValue {
  state: FileListState;
  dispatch: React.Dispatch<FileListAction>;
  actions: FileListActions;
  /**
   * folders + filesの統合リスト（派生値）
   */
  items: FileSystemItem[];
}

/**
 * FileListContext
 */
export const FileListContext = React.createContext<FileListContextValue | undefined>(
  undefined
);
