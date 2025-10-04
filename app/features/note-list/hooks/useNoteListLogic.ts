import { useEffect, useCallback } from 'react';
import { useNavigation, NavigationProp, useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../../../navigation/types';
import { useNoteStore, useNoteSelectionStore } from '../../../store/note';
import { logger } from '../../../utils/logger';

export const useNoteListLogic = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();

  // 各ストアから必要な状態とアクションを取得
  const notes = useNoteStore(state => state.filteredNotes);
  const loading = useNoteStore(state => state.loading);
  const fetchNotes = useNoteStore(state => state.fetchNotes);
  const createNote = useNoteStore(state => state.createNote);

  const isSelectionMode = useNoteSelectionStore(state => state.isSelectionMode);
  const selectedNoteIds = useNoteSelectionStore(state => state.selectedNoteIds);
  const toggleSelectionMode = useNoteSelectionStore(state => state.toggleSelectionMode);
  const toggleNoteSelection = useNoteSelectionStore(state => state.toggleNoteSelection);
  const clearSelectedNotes = useNoteSelectionStore(state => state.clearSelectedNotes);
  const deleteSelectedNotes = useNoteSelectionStore(state => state.deleteSelectedNotes);
  const copySelectedNotes = useNoteSelectionStore(state => state.copySelectedNotes);

  // デバッグ用ログ
  logger.debug('note', 'useNoteListLogic render:', { isSelectionMode, selectedCount: selectedNoteIds.size });

  useEffect(() => {
    if (isFocused) {
      fetchNotes();
    }
  }, [isFocused, fetchNotes]);

  // ノート選択ハンドラー
  const handleSelectNote = useCallback((noteId: string) => {
    if (isSelectionMode) {
      toggleNoteSelection(noteId);
    } else {
      navigation.navigate('NoteEdit', { noteId });
    }
  }, [isSelectionMode, toggleNoteSelection, navigation]);

  // ノート長押しハンドラー
  const handleLongPressNote = useCallback((noteId: string) => {
    if (!isSelectionMode) {
      toggleSelectionMode();
      toggleNoteSelection(noteId);
    }
  }, [isSelectionMode, toggleSelectionMode, toggleNoteSelection]);

  // 選択キャンセルハンドラー
  const handleCancelSelection = useCallback(() => {
    clearSelectedNotes();
  }, [clearSelectedNotes]);

  // 選択ノート削除ハンドラー
  const handleDeleteSelected = useCallback(async () => {
    try {
      await deleteSelectedNotes();
    } catch (error) {
      console.error("Failed to delete selected notes:", error);
    }
  }, [deleteSelectedNotes]);

  // 選択ノートコピーハンドラー
  const handleCopySelected = useCallback(async () => {
    try {
      await copySelectedNotes();
    } catch (error) {
      console.error("Failed to copy selected notes:", error);
    }
  }, [copySelectedNotes]);

  // ノート作成ハンドラー
  const handleCreateNote = useCallback(async () => {
    try {
      const newNote = await createNote({ title: '新しいノート', content: '' });
      navigation.navigate('NoteEdit', { noteId: newNote.id });
    } catch (error) {
      console.error("Failed to create note:", error);
    }
  }, [createNote, navigation]);

  return {
    notes,
    loading,
    isSelectionMode,
    selectedNoteIds,
    handleSelectNote,
    handleLongPressNote,
    handleCancelSelection,
    handleDeleteSelected,
    handleCopySelected,
    handleCreateNote,
    fetchNotes,
  };
};
