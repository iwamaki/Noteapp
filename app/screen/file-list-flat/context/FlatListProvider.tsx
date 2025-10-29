/**
 * @file FlatListProvider.tsx
 * @summary フラットリスト用のContext Provider
 * @description
 * フォルダ構造を排除した、シンプルな状態管理のProvider。
 * 既存のFileListProviderから大幅に簡素化。
 */

import React, { useReducer, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { FlatListContext } from './FlatListContext';
import { flatListReducer, initialFlatListState } from './flatListReducer';
import { FlatListActions } from './types';
import { FileListUseCasesFlat } from '../application/FileListUseCasesFlat';
import { FileFlat } from '@data/core/typesFlat';
import { logger } from '../../../utils/logger';

/**
 * フラットリストProvider
 *
 * 既存のFileListProviderから削除した機能：
 * - フォルダ関連の操作
 * - ツリー構造の構築
 * - 移動モード
 * - パス管理
 */
export const FlatListProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(flatListReducer, initialFlatListState);

  // =============================================================================
  // アクション関数の実装
  // =============================================================================

  /**
   * データを再取得
   */
  const refreshData = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      logger.info('file', 'Refreshing flat file list...');

      // 全ファイルを取得
      const files = await FileListUseCasesFlat.getAllFiles();

      logger.info('file', `Loaded ${files.length} files`);

      dispatch({ type: 'SET_FILES', payload: files });
    } catch (error: any) {
      logger.error('file', `Failed to refresh data: ${error.message}`, error);
      dispatch({ type: 'SET_ERROR', payload: error.message });
      Alert.alert('エラー', 'データの読み込みに失敗しました');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  /**
   * ファイルを作成
   */
  const createFile = useCallback(
    async (
      title: string,
      content: string = '',
      category: string = '',
      tags: string[] = []
    ): Promise<FileFlat> => {
      try {
        logger.info('file', `Creating file: ${title}`);

        const file = await FileListUseCasesFlat.createFile(
          title,
          content,
          category,
          tags
        );

        logger.info('file', `File created: ${file.id}`);

        // 状態に追加
        dispatch({ type: 'ADD_FILE', payload: file });

        return file;
      } catch (error: any) {
        logger.error('file', `Failed to create file: ${error.message}`, error);
        throw error;
      }
    },
    []
  );

  /**
   * ファイルをリネーム
   */
  const renameFile = useCallback(async (fileId: string, newTitle: string) => {
    try {
      logger.info('file', `Renaming file ${fileId} to ${newTitle}`);

      const updatedFile = await FileListUseCasesFlat.renameFile(fileId, newTitle);

      logger.info('file', `File renamed: ${fileId}`);

      // 状態を更新
      dispatch({ type: 'UPDATE_FILE', payload: updatedFile });
    } catch (error: any) {
      logger.error('file', `Failed to rename file: ${error.message}`, error);
      throw error;
    }
  }, []);

  /**
   * 選択されたファイルを削除
   */
  const deleteSelectedFiles = useCallback(async (fileIds: string[]) => {
    try {
      logger.info('file', `Deleting ${fileIds.length} files`);

      await FileListUseCasesFlat.deleteSelectedFiles(fileIds);

      logger.info('file', `Files deleted: ${fileIds.length}`);

      // 状態から削除
      fileIds.forEach((id) => {
        dispatch({ type: 'REMOVE_FILE', payload: id });
      });

      // 選択モードを終了
      dispatch({ type: 'EXIT_SELECTION_MODE' });
    } catch (error: any) {
      logger.error('file', `Failed to delete files: ${error.message}`, error);
      throw error;
    }
  }, []);

  /**
   * 選択されたファイルをコピー
   */
  const copySelectedFiles = useCallback(async (fileIds: string[]) => {
    try {
      logger.info('file', `Copying ${fileIds.length} files`);

      const copiedFiles = await FileListUseCasesFlat.copyFiles(fileIds);

      logger.info('file', `Files copied: ${copiedFiles.length}`);

      // 状態に追加
      copiedFiles.forEach((file) => {
        dispatch({ type: 'ADD_FILE', payload: file });
      });

      // 選択モードを終了
      dispatch({ type: 'EXIT_SELECTION_MODE' });
    } catch (error: any) {
      logger.error('file', `Failed to copy files: ${error.message}`, error);
      throw error;
    }
  }, []);

  /**
   * ファイルのカテゴリーを更新
   */
  const updateFileCategory = useCallback(
    async (fileId: string, category: string) => {
      try {
        logger.info('file', `Updating category for file ${fileId}`);

        const updatedFile = await FileListUseCasesFlat.updateFileCategory(
          fileId,
          category
        );

        logger.info('file', `Category updated for file ${fileId}`);

        // 状態を更新
        dispatch({ type: 'UPDATE_FILE', payload: updatedFile });
      } catch (error: any) {
        logger.error(
          'file',
          `Failed to update category: ${error.message}`,
          error
        );
        throw error;
      }
    },
    []
  );

  /**
   * ファイルのタグを更新
   */
  const updateFileTags = useCallback(
    async (fileId: string, tags: string[]) => {
      try {
        logger.info('file', `Updating tags for file ${fileId}`);

        const updatedFile = await FileListUseCasesFlat.updateFileTags(
          fileId,
          tags
        );

        logger.info('file', `Tags updated for file ${fileId}`);

        // 状態を更新
        dispatch({ type: 'UPDATE_FILE', payload: updatedFile });
      } catch (error: any) {
        logger.error('file', `Failed to update tags: ${error.message}`, error);
        throw error;
      }
    },
    []
  );

  /**
   * カテゴリーでフィルタリング
   */
  const filterByCategory = useCallback(async (categoryName: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      logger.info('file', `Filtering by category: ${categoryName}`);

      const files = await FileListUseCasesFlat.getFilesByCategory(categoryName);

      logger.info('file', `Filtered ${files.length} files by category`);

      dispatch({ type: 'SET_FILES', payload: files });
      dispatch({ type: 'SET_SELECTED_CATEGORIES', payload: [categoryName] });
    } catch (error: any) {
      logger.error('file', `Failed to filter by category: ${error.message}`, error);
      Alert.alert('エラー', 'カテゴリーフィルタリングに失敗しました');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  /**
   * タグでフィルタリング
   */
  const filterByTag = useCallback(async (tagName: string) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });

      logger.info('file', `Filtering by tag: ${tagName}`);

      const files = await FileListUseCasesFlat.getFilesByTag(tagName);

      logger.info('file', `Filtered ${files.length} files by tag`);

      dispatch({ type: 'SET_FILES', payload: files });
      dispatch({ type: 'SET_SELECTED_TAGS', payload: [tagName] });
    } catch (error: any) {
      logger.error('file', `Failed to filter by tag: ${error.message}`, error);
      Alert.alert('エラー', 'タグフィルタリングに失敗しました');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  /**
   * 検索
   */
  const search = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);

  /**
   * フィルターをクリア
   */
  const clearFilters = useCallback(() => {
    dispatch({ type: 'CLEAR_FILTERS' });
    refreshData();
  }, [refreshData]);

  // =============================================================================
  // アクションオブジェクトをメモ化
  // =============================================================================

  const actions: FlatListActions = useMemo(
    () => ({
      refreshData,
      createFile,
      renameFile,
      deleteSelectedFiles,
      copySelectedFiles,
      updateFileCategory,
      updateFileTags,
      filterByCategory,
      filterByTag,
      search,
      clearFilters,
    }),
    [
      refreshData,
      createFile,
      renameFile,
      deleteSelectedFiles,
      copySelectedFiles,
      updateFileCategory,
      updateFileTags,
      filterByCategory,
      filterByTag,
      search,
      clearFilters,
    ]
  );

  // =============================================================================
  // コンテキスト値をメモ化
  // =============================================================================

  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      actions,
    }),
    [state, actions]
  );

  return (
    <FlatListContext.Provider value={contextValue}>
      {children}
    </FlatListContext.Provider>
  );
};
