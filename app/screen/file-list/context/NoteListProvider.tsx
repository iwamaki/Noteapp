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
import { FileSystemItem } from '@shared/types/file';

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
   * 選択されたノートをコピー
   */
  const copySelectedNotes = useCallback(
    async (noteIds: string[]) => {
      const copiedNotes = await NoteListUseCases.copyNotes(noteIds);
      await refreshData();
      return copiedNotes;
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
      copySelectedNotes,
    }),
    [
      refreshData,
      renameFolder,
      renameNote,
      deleteSelectedItems,
      moveSelectedItems,
      createFolder,
      createNoteWithPath,
      copySelectedNotes,
    ]
  );

  /**
   * folders + notesの統合リスト（派生値）
   */
  const items: FileSystemItem[] = useMemo(() => {
    const folderItems: FileSystemItem[] = state.folders.map(folder => ({
      type: 'folder' as const,
      item: folder,
    }));
    const noteItems: FileSystemItem[] = state.notes.map(note => ({
      type: 'file' as const,
      item: note,
    }));
    return [...folderItems, ...noteItems];
  }, [state.folders, state.notes]);

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

  return <NoteListContext.Provider value={value}>{children}</NoteListContext.Provider>;
};
