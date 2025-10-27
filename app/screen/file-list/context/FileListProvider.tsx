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
import { FileRepositoryV2 } from '@data/fileRepositoryV2';
import { FolderRepositoryV2 } from '@data/folderRepositoryV2';
import { FileListUseCasesV2 } from '../application/FileListUseCasesV2';
import { FileSystemItem } from '@data/types';
import { logger } from '@utils/logger';

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
   * FileSystemから最新データを取得し、状態を更新（V2）
   */
  const refreshData = useCallback(async () => {
    logger.debug('file', 'refreshData: Starting data refresh (V2).');
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // V2リポジトリを使用してルートレベルのアイテムを取得
      const [folders, files] = await Promise.all([
        FolderRepositoryV2.getByParentPath('/'),
        FileRepositoryV2.getByFolderPath('/'),
      ]);

      logger.debug('file', `refreshData: Fetched ${folders.length} folders and ${files.length} files.`);

      // パス情報を構築
      const folderPaths = new Map<string, string>();
      const filePaths = new Map<string, string>();
      const loadedPaths = new Set<string>();

      // ルートフォルダのパスを設定
      folders.forEach(folder => {
        folderPaths.set(folder.id, `/${folder.slug}/`);
      });

      // ルートファイルの親パスを設定
      files.forEach(file => {
        filePaths.set(file.id, '/');
      });

      // ルートパスを読み込み済みとしてマーク
      loadedPaths.add('/');

      dispatch({
        type: 'REFRESH_COMPLETE',
        payload: { folders, files, folderPaths, filePaths, loadedPaths },
      });
      logger.debug('file', 'refreshData: Dispatched REFRESH_COMPLETE.');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      logger.error('file', `refreshData: Error during data refresh (V2): ${errorMessage}`, error);
      dispatch({ type: 'SET_LOADING', payload: false });
      throw error;
    }
  }, []);

  /**
   * フォルダの子アイテムを読み込む
   * フォルダが展開されたときに呼び出される
   */
  const loadFolderChildren = useCallback(
    async (folderId: string, folderPath: string) => {
      // 既に読み込み済みの場合はスキップ
      if (state.loadedPaths.has(folderPath)) {
        logger.debug('file', `loadFolderChildren: Path ${folderPath} already loaded, skipping.`);
        return;
      }

      logger.debug('file', `loadFolderChildren: Loading children for folder ${folderId} at path ${folderPath}`);

      try {
        // 子フォルダと子ファイルを並行取得
        const [childFolders, childFiles] = await Promise.all([
          FolderRepositoryV2.getByParentPath(folderPath),
          FileRepositoryV2.getByFolderPath(folderPath),
        ]);

        logger.debug(
          'file',
          `loadFolderChildren: Fetched ${childFolders.length} folders and ${childFiles.length} files for ${folderPath}`
        );

        // ADD_FOLDER_CHILDRENアクションをディスパッチ
        dispatch({
          type: 'ADD_FOLDER_CHILDREN',
          payload: {
            parentPath: folderPath,
            folders: childFolders,
            files: childFiles,
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logger.error('file', `loadFolderChildren: Error loading children for ${folderPath}: ${errorMessage}`, error);
        throw error;
      }
    },
    [state.loadedPaths, dispatch]
  );

  /**
   * フォルダをリネーム
   * 子要素のパスも自動的に更新（V2）
   */
  const renameFolder = useCallback(
    async (folderId: string, newName: string) => {
      // V2: UseCaseを実行（FileSystem書き込みが完了するまで待機）
      await FileListUseCasesV2.renameFolder(folderId, newName);

      // refreshData() でデータを再取得
      await refreshData();
    },
    [refreshData]
  );

  /**
   * ファイルをリネーム（V2）
   */
  const renameFile = useCallback(
    async (fileId: string, newTitle: string) => {
      await FileListUseCasesV2.renameFile(fileId, newTitle);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * 選択されたアイテムを削除（V2）
   */
  const deleteSelectedItems = useCallback(
    async (fileIds: string[], folderIds: string[]) => {
      await FileListUseCasesV2.deleteSelectedItems(fileIds, folderIds);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * 選択されたアイテムを移動（V2）
   */
  const moveSelectedItems = useCallback(
    async (fileIds: string[], folderIds: string[], targetPath: string) => {
      await FileListUseCasesV2.moveSelectedItems(fileIds, folderIds, targetPath);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * フォルダを作成（V2）
   */
  const createFolder = useCallback(
    async (name: string, parentPath: string) => {
      const folder = await FileListUseCasesV2.createFolder(name, parentPath);
      await refreshData();
      return folder;
    },
    [refreshData]
  );

  /**
   * ファイルをパス指定で作成（V2）
   */
  const createFileWithPath = useCallback(
    async (inputPath: string, content?: string, tags?: string[]) => {
      const file = await FileListUseCasesV2.createFileWithPath(
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
   * 選択されたファイルをコピー（V2）
   */
  const copySelectedFiles = useCallback(
    async (fileIds: string[]) => {
      const copiedFiles = await FileListUseCasesV2.copyFiles(fileIds);
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
      loadFolderChildren,
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
      loadFolderChildren,
      renameFolder,
      renameFile,
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
