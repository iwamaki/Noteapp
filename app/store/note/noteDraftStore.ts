/**
 * @file noteDraftStore.ts
 * @summary ドラフトノートの編集状態を管理するストア
 * @responsibility 編集中のノート内容、変更検知、保存、破棄などのドラフト関連操作を管理
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Note } from '../../../shared/types/note';
import { eventBus } from '../../services/eventBus';
import { NoteStorageService } from '../../services/storageService';

// 型定義
export interface DraftNote {
  title: string;
  content: string;
  tags?: string[];
}

interface NoteDraftStoreState {
  // データ
  activeNoteId: string | null; // To track which note the draft belongs to
  draftNote: DraftNote | null;
  originalDraftContent: DraftNote | null; // To compare for modifications

  // アクション
  setDraftNote: (draft: DraftNote | null) => void;
  saveDraftNote: () => Promise<void>; // Will emit an event, not return a Note directly
  discardDraft: () => void;
  isDraftModified: () => boolean;
}

export const useNoteDraftStore = create<NoteDraftStoreState>()(
  subscribeWithSelector((set, get) => {
    // EventBus Listeners
    eventBus.on('note:selected', async ({ noteId }) => {
      if (noteId) {
        const note = await NoteStorageService.getNoteById(noteId);
        if (note) {
          set({
            activeNoteId: note.id,
            draftNote: {
              title: note.title,
              content: note.content,
              tags: note.tags,
            },
            originalDraftContent: {
              title: note.title,
              content: note.content,
              tags: note.tags,
            },
          });
        }
      } else {
        get().discardDraft();
      }
    });

    eventBus.on('note:created', ({ note }) => {
      const { draftNote, discardDraft } = get();
      if (draftNote && note.id && draftNote.title === note.title && draftNote.content === note.content) {
        // If the created note matches the current draft, clear the draft
        discardDraft();
      }
    });

    eventBus.on('note:updated', ({ note }) => {
      const { draftNote, discardDraft } = get();
      if (draftNote && note.id && draftNote.title === note.title && draftNote.content === note.content) {
        // If the updated note matches the current draft, clear the draft
        discardDraft();
      }
    });

    eventBus.on('note:deleted', ({ noteId }) => {
      const { draftNote, discardDraft } = get();
      // Assuming draftNote might have an ID if it's an existing note's draft
      if (draftNote && noteId && (draftNote as Note).id === noteId) {
        discardDraft();
      }
    });

    return {
      // 初期状態
      draftNote: null,
      activeNoteId: null,
      originalDraftContent: null,

    // ドラフト設定
    setDraftNote: (draft) => {
      set({ draftNote: draft });
    },

    // ドラフト保存
    saveDraftNote: async () => {
      const { draftNote, activeNoteId } = get();

      if (!draftNote) {
        throw new Error('Draft note is not set. Cannot save.');
      }

      try {
        await eventBus.emit('draft:save-requested', { draftNote, activeNoteId });
        set({ draftNote: null, activeNoteId: null, originalDraftContent: null });
      } catch (error) {
        console.error('Failed to save draft note:', error);
        throw error;
      }
    },

    // ドラフト変更状態チェック
    isDraftModified: () => {
      const { draftNote, originalDraftContent } = get();

      if (!draftNote) return false;
      if (!originalDraftContent) return Boolean(draftNote.title || draftNote.content); // 新規ドラフトの場合

      return (
        draftNote.title !== originalDraftContent.title ||
        draftNote.content !== originalDraftContent.content ||
        JSON.stringify(draftNote.tags || []) !== JSON.stringify(originalDraftContent.tags || [])
      );
    },

    // ドラフト破棄
    discardDraft: () => {
      const { originalDraftContent } = get();

      if (originalDraftContent) {
        set({
          draftNote: {
            title: originalDraftContent.title,
            content: originalDraftContent.content,
            tags: originalDraftContent.tags
          },
          activeNoteId: get().activeNoteId, // activeNoteId は維持
          originalDraftContent: originalDraftContent // originalDraftContent も維持
        });
      } else {
        set({ draftNote: null, activeNoteId: null, originalDraftContent: null });
      }
    },
  };
  })
);
