/**
 * @file noteDraftStore.ts
 * @summary ドラフトノートの編集状態を管理するストア
 * @responsibility 編集中のノート内容、変更検知、保存、破棄などのドラフト関連操作を管理
 */
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Note } from '../../services/storageService';
import { useNoteStore } from './noteStore';

// 型定義
export interface DraftNote {
  title: string;
  content: string;
  tags?: string[];
}

interface NoteDraftStoreState {
  // データ
  draftNote: DraftNote | null;

  // アクション
  setDraftNote: (draft: DraftNote | null) => void;
  saveDraftNote: () => Promise<Note>;
  discardDraft: () => void;
  isDraftModified: () => boolean;
}

export const useNoteDraftStore = create<NoteDraftStoreState>()(
  subscribeWithSelector((set, get) => ({
    // 初期状態
    draftNote: null,

    // ドラフト設定
    setDraftNote: (draft) => {
      set({ draftNote: draft });
    },

    // ドラフト保存
    saveDraftNote: async () => {
      const { draftNote } = get();
      const activeNote = useNoteStore.getState().activeNote;

      if (!draftNote) {
        throw new Error('Draft note is not set. Cannot save.');
      }

      try {
        let savedNote: Note;

        if (activeNote) {
          // 既存ノート更新
          savedNote = await useNoteStore.getState().updateNote({
            id: activeNote.id,
            ...draftNote
          });
        } else {
          // 新規ノート作成
          savedNote = await useNoteStore.getState().createNote(draftNote);
        }

        // ドラフトを保存後の状態に同期
        set({
          draftNote: {
            title: savedNote.title,
            content: savedNote.content,
            tags: savedNote.tags
          }
        });

        return savedNote;
      } catch (error) {
        console.error('Failed to save draft note:', error);
        throw error;
      }
    },

    // ドラフト変更状態チェック
    isDraftModified: () => {
      const { draftNote } = get();
      const activeNote = useNoteStore.getState().activeNote;

      if (!draftNote) return false;
      if (!activeNote) return Boolean(draftNote.title || draftNote.content);

      return (
        activeNote.title !== draftNote.title ||
        activeNote.content !== draftNote.content ||
        JSON.stringify(activeNote.tags || []) !== JSON.stringify(draftNote.tags || [])
      );
    },

    // ドラフト破棄
    discardDraft: () => {
      const activeNote = useNoteStore.getState().activeNote;

      if (activeNote) {
        set({
          draftNote: {
            title: activeNote.title,
            content: activeNote.content,
            tags: activeNote.tags
          }
        });
      } else {
        set({ draftNote: null });
      }
    },
  }))
);
