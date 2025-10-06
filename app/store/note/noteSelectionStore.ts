/**
 * @file noteSelectionStore.ts
 * @summary ノート選択モードと複数選択操作を管理するストア
 * @responsibility 選択モードの状態、選択されたノートのID管理、一括削除・一括複製などの操作を管理
 */
import { Note } from '../../../shared/types/note';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { eventBus } from '../../services/eventBus';
import { NoteActionService } from '../../services/NoteActionService';


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
  subscribeWithSelector((set, get) => {
    // EventBusリスナーの登録
    // 一括操作時に選択状態をクリアする
    // noteStoreがこれらのイベントを発火することを想定
    eventBus.on('notes:bulk-deleted', () => {
      get().clearSelectedNotes();
    });
    eventBus.on('notes:bulk-copied', () => {
      get().clearSelectedNotes();
    });

    return ({
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
          await NoteActionService.bulkDeleteNotes(Array.from(selectedNoteIds));
          // NoteActionService will emit 'notes:bulk-deleted', which this store listens to
          // to clear selected notes. So no need to clear here directly.
        } catch (error) {
          console.error('Failed to delete selected notes:', error);
          // Error event is emitted by NoteActionService
          throw error;
        }
      },

      // 選択されたノートの複製
      copySelectedNotes: async () => {
        const { selectedNoteIds } = get();

        if (selectedNoteIds.size === 0) return;

        try {
          await NoteActionService.bulkCopyNotes(Array.from(selectedNoteIds));
          // NoteActionService will emit 'notes:bulk-copied', which this store listens to
          // to clear selected notes. So no need to clear here directly.
        } catch (error) {
          console.error('Failed to copy selected notes:', error);
          // Error event is emitted by NoteActionService
          throw error;
        }
      },
    });
  })
);
