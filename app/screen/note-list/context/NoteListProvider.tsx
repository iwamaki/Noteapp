/**
 * @file NoteListProvider.tsx
 * @summary NoteList画面の状態管理Provider
 * @description
 * useReducerとContextを組み合わせて、状態管理を一元化します。
 * AsyncStorageとの非同期処理を確実に管理します。
 */

import React, { useReducer, useCallback, useMemo } from 'react';
import { NoteListContext, NoteListActions } from './NoteListContext';
import { noteListReducer, createInitialState } from './noteListReducer';
import { NoteRepository } from '../infrastructure/NoteRepository';
import { FolderRepository } from '../infrastructure/FolderRepository';
import { NoteListUseCases } from '../application/NoteListUseCases';

interface NoteListProviderProps {
  children: React.ReactNode;
}

/**
 * NoteListProvider
 * 状態管理とビジネスロジックを提供
 */
export const NoteListProvider: React.FC<NoteListProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(noteListReducer, undefined, createInitialState);

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
      const [folders, notes] = await Promise.all([
        FolderRepository.getAll(),
        NoteRepository.getAll(),
      ]);

      // データ更新と状態リセットを一括実行
      dispatch({ type: 'REFRESH_COMPLETE', payload: { folders, notes } });
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
      await NoteListUseCases.renameFolder(folderId, newName);

      // 2. refreshData() でデータを再取得
      // この時点で AsyncStorage の書き込みは完了しているため、
      // 確実に最新データが取得できる
      await refreshData();
    },
    [refreshData]
  );

  /**
   * ノートをリネーム
   */
  const renameNote = useCallback(
    async (noteId: string, newTitle: string) => {
      await NoteListUseCases.renameNote(noteId, newTitle);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * 選択されたアイテムを削除
   */
  const deleteSelectedItems = useCallback(
    async (noteIds: string[], folderIds: string[]) => {
      await NoteListUseCases.deleteSelectedItems(noteIds, folderIds);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * 選択されたアイテムを移動
   */
  const moveSelectedItems = useCallback(
    async (noteIds: string[], folderIds: string[], targetPath: string) => {
      await NoteListUseCases.moveSelectedItems(noteIds, folderIds, targetPath);
      await refreshData();
    },
    [refreshData]
  );

  /**
   * フォルダを作成
   */
  const createFolder = useCallback(
    async (name: string, parentPath: string) => {
      const folder = await NoteListUseCases.createFolder(name, parentPath);
      await refreshData();
      return folder;
    },
    [refreshData]
  );

  /**
   * ノートをパス指定で作成
   */
  const createNoteWithPath = useCallback(
    async (inputPath: string, content?: string, tags?: string[]) => {
      const note = await NoteListUseCases.createNoteWithPath(
        inputPath,
        content,
        tags
      );
      await refreshData();
      return note;
    },
    [refreshData]
  );

  /**
   * アクションヘルパーをメモ化
   */
  const actions: NoteListActions = useMemo(
    () => ({
      refreshData,
      renameFolder,
      renameNote,
      deleteSelectedItems,
      moveSelectedItems,
      createFolder,
      createNoteWithPath,
    }),
    [
      refreshData,
      renameFolder,
      renameNote,
      deleteSelectedItems,
      moveSelectedItems,
      createFolder,
      createNoteWithPath,
    ]
  );

  /**
   * Contextの値をメモ化
   */
  const value = useMemo(
    () => ({
      state,
      dispatch,
      actions,
    }),
    [state, actions]
  );

  return <NoteListContext.Provider value={value}>{children}</NoteListContext.Provider>;
};
