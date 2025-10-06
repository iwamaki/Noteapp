/**
 * @file noteSelectionStore.ts
 * @summary ノート選択モードと複数選択操作を管理するストア
 * @responsibility 選択モードの状態、選択されたノートのID管理、一括削除・一括複製などの操作を管理
 */
import { Note } from '../../../shared/types/note';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { NoteStorageService } from '../../services/storageService';
import { useNoteStore } from './noteStore';

interface NoteSelectionStoreState {
  // 選択モード
  isSelectionMode: boolean;
  selectedNoteIds: Set<string>;

  // アクション
  toggleSelectionMode: () => void;
  toggleNoteSelection: (noteId: string) => void;
  clearSelectedNotes: () => void;
  deleteSelectedNotes: () => Promise<void>;
  copySelectedNotes: () => Promise<void>;
}

export const useNoteSelectionStore = create<NoteSelectionStoreState>()(
  subscribeWithSelector((set, get) => ({
    // 初期状態
    isSelectionMode: false,
    selectedNoteIds: new Set<string>(),

    // 選択モード切り替え
    toggleSelectionMode: () => {
      const { isSelectionMode } = get();
      set({
        isSelectionMode: !isSelectionMode,
        selectedNoteIds: new Set<string>()
      });
    },

    // ノート選択状態切り替え
    toggleNoteSelection: (noteId: string) => {
      const { selectedNoteIds } = get();
      const newSelectedIds = new Set(selectedNoteIds);

      if (newSelectedIds.has(noteId)) {
        newSelectedIds.delete(noteId);
      } else {
        newSelectedIds.add(noteId);
      }

      set({ selectedNoteIds: newSelectedIds });
    },

    // 選択解除
    clearSelectedNotes: () => {
      console.log('clearSelectedNotes called');
      set({
        selectedNoteIds: new Set<string>(),
        isSelectionMode: false
      });
    },

    // 選択されたノートの削除
    deleteSelectedNotes: async () => {
      const { selectedNoteIds } = get();

      if (selectedNoteIds.size === 0) return;

      try {
        for (const noteId of selectedNoteIds) {
          await NoteStorageService.deleteNote(noteId);
        }

        await useNoteStore.getState().fetchNotes();
        set({
          selectedNoteIds: new Set<string>(),
          isSelectionMode: false
        });
      } catch (error) {
        console.error('Failed to delete selected notes:', error);
        throw error;
      }
    },

    // 選択されたノートの複製
    copySelectedNotes: async () => {
      const { selectedNoteIds } = get();
      const notes = useNoteStore.getState().notes;

      if (selectedNoteIds.size === 0) return;

      try {
        for (const noteId of selectedNoteIds) {
          const originalNote = notes.find(note => note.id === noteId);
          if (originalNote) {
            await NoteStorageService.createNote({
              title: `${originalNote.title} (コピー)`,
              content: originalNote.content,
              tags: originalNote.tags
            });
          }
        }

        await useNoteStore.getState().fetchNotes();
        set({
          selectedNoteIds: new Set<string>(),
          isSelectionMode: false
        });
      } catch (error) {
        console.error('Failed to copy selected notes:', error);
        throw error;
      }
    },
  }))
);
