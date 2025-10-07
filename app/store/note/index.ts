/**
 * @file index.ts
 * @summary ノート関連ストアの統合エクスポート
 * @description 3つのストア(noteStore, noteDraftStore, noteSelectionStore)をまとめて提供
 */

// 基本CRUD操作
export {
  useNoteStore,
  type NoteError,
  type LoadingState
} from './noteStore';

// ドラフト管理
export {
  useNoteDraftStore
} from './noteDraftStore';

// DraftNote型は共通型ファイルから再エクスポート
export type { DraftNote } from '../../../shared/types/note';

// 選択モード
export {
  useNoteSelectionStore
} from './noteSelectionStore';

// 便利なヘルパーフック: すべてのストアを一括で使用
import { useNoteStore } from './noteStore';
import { useNoteDraftStore } from './noteDraftStore';
import { useNoteSelectionStore } from './noteSelectionStore';

export const useNoteStores = () => {
  const noteStore = useNoteStore();
  const draftStore = useNoteDraftStore();
  const selectionStore = useNoteSelectionStore();

  return {
    // noteStore
    notes: noteStore.notes,
    activeNote: noteStore.activeNote,
    loading: noteStore.loading,
    error: noteStore.error,
    lastUpdated: noteStore.lastUpdated,
    searchQuery: noteStore.searchQuery,
    filteredNotes: noteStore.filteredNotes,
    fetchNotes: noteStore.fetchNotes,
    selectNote: noteStore.selectNote,
    createNote: noteStore.createNote,
    updateNote: noteStore.updateNote,
    deleteNote: noteStore.deleteNote,
    searchNotes: noteStore.searchNotes,
    clearError: noteStore.clearError,

    // draftStore
    draftNote: draftStore.draftNote,
    setDraftNote: draftStore.setDraftNote,
    saveDraftNote: draftStore.saveDraftNote,
    discardDraft: draftStore.discardDraft,
    isDraftModified: draftStore.isDraftModified,

    // selectionStore
    isSelectionMode: selectionStore.isSelectionMode,
    selectedNoteIds: selectionStore.selectedNoteIds,
    toggleSelectionMode: selectionStore.toggleSelectionMode,
    toggleNoteSelection: selectionStore.toggleNoteSelection,
    clearSelectedNotes: selectionStore.clearSelectedNotes,
    deleteSelectedNotes: selectionStore.deleteSelectedNotes,
    copySelectedNotes: selectionStore.copySelectedNotes,
  };
};
