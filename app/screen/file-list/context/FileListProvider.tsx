/**
 * @file FileListProvider.tsx
 * @summary FileList画面の状態管理Provider
 * @description
 * useReducerとContextを組み合わせて、状態管理を一元化します。
 * AsyncStorageとの非同期処理を確実に管理します。
 */

import React, { useReducer, useCallback, useMemo } from 'react';
import { FileListContext, FileListActions } from './FileListContext';
import { fileListReducer, createInitialState } from './fileListReducer';
import { FileRepository } from '@data/fileRepository';
import { FolderRepository } from '@data/folderRepository';
import { FileListUseCases } from '../application/FileListUseCases';
import { FileSystemItem } from '@data/type';

interface FileListProviderProps {
  children: React.ReactNode;
}

/**
 * FileListProvider
 * 状態管理とビジネスロジックを提供
 */
export const FileListProvider: React.FC<FileListProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(fileListReducer, undefined, createInitialState);

  /**
   * データを再取得してリフレッシュ
   * AsyncStorageから最新データを取得し、状態を更新
   */
  const refreshData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // AsyncStorageから確実にデータを取得
      // batchUpdate() などの await が完了した後に呼ばれるため、
      // 確実に最新データが取得できる
      const [folders, files] = await Promise.all([
        FolderRepository.getAll(),
        FileRepository.getAll(),
      ]);

      // データ更新と状態リセットを一括実行
      dispatch({ type: 'REFRESH_COMPLETE', payload: { folders, files } });
    } catch (error) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  }, []);

  /**
   * フォルダをリネーム
   * 子要素のパスも自動的に更新
   */
  const renameFolder = useCallback(
    async (folderId: string, newName: string) => {
      // 1. UseCaseを実行（AsyncStorage書き込みが完了するまで待機）
      await FileListUseCases.renameFolder(folderId, newName);

      // 2. refreshData() でデータを再取得
      // この時点で AsyncStorage の書き込みは完了しているため、
      // 確実に最新データが取得できる
      await refreshData();
    },
    [refreshData]
  );

  /**
   * ファイルをリネーム
   */
  const renameFile = useCallback(
    async (fileId: string, newTitle: string) => {
      await FileListUseCases.renameFile(fileId, newTitle);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * 選択されたアイテムを削除
   */
  const deleteSelectedItems = useCallback(
    async (fileIds: string[], folderIds: string[]) => {
      await FileListUseCases.deleteSelectedItems(fileIds, folderIds);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * 選択されたアイテムを移動
   */
  const moveSelectedItems = useCallback(
    async (fileIds: string[], folderIds: string[], targetPath: string) => {
      await FileListUseCases.moveSelectedItems(fileIds, folderIds, targetPath);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * フォルダを作成
   */
  const createFolder = useCallback(
    async (name: string, parentPath: string) => {
      const folder = await FileListUseCases.createFolder(name, parentPath);
      await refreshData();
      return folder;
    },
    [refreshData]
  );

  /**
   * ファイルをパス指定で作成
   */
  const createFileWithPath = useCallback(
    async (inputPath: string, content?: string, tags?: string[]) => {
      const file = await FileListUseCases.createFileWithPath(
        inputPath,
        content,
        tags
      );
      await refreshData();
      return file;
    },
    [refreshData]
  );

  /**
   * 選択されたファイルをコピー
   */
  const copySelectedFiles = useCallback(
    async (fileIds: string[]) => {
      const copiedFiles = await FileListUseCases.copyFiles(fileIds);
      await refreshData();
      return copiedFiles;
    },
    [refreshData]
  );

  /**
   * アクションヘルパーをメモ化
   */
  const actions: FileListActions = useMemo(
    () => ({
      refreshData,
      renameFolder,
      renameFile,
      deleteSelectedItems,
      moveSelectedItems,
      createFolder,
      createFileWithPath,
      copySelectedFiles,
    }),
    [
      refreshData,
      renameFolder,
      deleteSelectedItems,
      moveSelectedItems,
      createFolder,
      createFileWithPath,
      copySelectedFiles,
    ]
  );

  /**
   * folders + filesの統合リスト（派生値）
   */
  const items: FileSystemItem[] = useMemo(() => {
    const folderItems: FileSystemItem[] = state.folders.map(folder => ({
      type: 'folder' as const,
      item: folder,
    }));
    const fileItems: FileSystemItem[] = state.files.map(file => ({
      type: 'file' as const,
      item: file,
    }));
    return [...folderItems, ...fileItems];
  }, [state.folders, state.files]);

  /**
   * Contextの値をメモ化
   */
  const value = useMemo(
    () => ({
      state,
      dispatch,
      actions,
      items,
    }),
    [state, actions, items]
  );

  return <FileListContext.Provider value={value}>{children}</FileListContext.Provider>;
};
