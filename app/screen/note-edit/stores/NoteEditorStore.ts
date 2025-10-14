/**
 * @file stores/NoteEditorStore.ts
 * @summary ノート編集の状態管理（Zustand Store）
 * @description エディタの状態とアクションを一元管理
 */

import { create } from 'zustand';
import { EditorState, EditorActions, ViewMode, EditorError } from '../types';
import { Note } from '@shared/types/note';
import { noteService } from '../services/NoteService';
import { HistoryManager } from './HistoryManager';

/**
 * ノートエディタストアの型定義
 */
interface NoteEditorStore extends EditorState, EditorActions {
  // 追加の状態
  noteId: string | null;
  originalNote: Note | null;
  history: HistoryManager;

  // 追加のアクション
  initialize: (noteId?: string) => Promise<void>;
  cleanup: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/**
 * Zustandストア
 * エディタの状態とアクションを統一管理
 */
export const useNoteEditorStore = create<NoteEditorStore>((set, get) => ({
  // ===== 初期状態 =====
  note: null,
  content: '',
  title: '',
  isDirty: false,
  isLoading: false,
  isSaving: false,
  error: null,
  viewMode: 'edit' as ViewMode,
  wordWrap: true,
  noteId: null,
  originalNote: null,
  history: new HistoryManager(),

  // ===== 初期化 =====
  initialize: async (noteId?: string) => {
    set({
      isLoading: true,
      error: null,
      noteId: noteId || null,
    });

    try {
      if (noteId) {
        // 既存ノートを読み込む
        const note = await noteService.loadNote(noteId);
        set({
          note,
          originalNote: note,
          content: note.content,
          title: note.title,
          isDirty: false,
          isLoading: false,
        });
        get().history.reset(note.content);
      } else {
        // 新規ノートの作成
        set({
          note: null,
          originalNote: null,
          content: '',
          title: '',
          isDirty: false,
          isLoading: false,
        });
        get().history.reset('');
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error as EditorError,
      });
    }
  },

  // ===== コンテンツ設定 =====
  setContent: (content: string) => {
    const { originalNote } = get();

    set((state) => ({
      content,
      isDirty:
        content !== originalNote?.content || state.title !== originalNote?.title,
    }));

    get().history.push(content);
  },

  // ===== タイトル設定 =====
  setTitle: (title: string) => {
    const { originalNote, content } = get();

    set({
      title,
      isDirty:
        content !== originalNote?.content || title !== originalNote?.title,
    });
  },

  // ===== 保存 =====
  save: async () => {
    const { noteId, title, content, isDirty } = get();

    if (!isDirty) {
      return;
    }

    set({
      isSaving: true,
      error: null,
    });

    try {
      const savedNote = await noteService.save({
        id: noteId || undefined,
        title,
        content,
      });

      set({
        isSaving: false,
        isDirty: false,
        note: savedNote,
        originalNote: savedNote,
        noteId: savedNote.id,
      });
    } catch (error) {
      set({
        isSaving: false,
        error: error as EditorError,
      });
      throw error;
    }
  },

  // ===== Undo =====
  undo: () => {
    const { history } = get();
    const content = history.undo();

    if (content !== null) {
      set((state) => ({
        content,
        isDirty:
          content !== state.originalNote?.content ||
          state.title !== state.originalNote?.title,
      }));
    }
  },

  // ===== Redo =====
  redo: () => {
    const { history } = get();
    const content = history.redo();

    if (content !== null) {
      set((state) => ({
        content,
        isDirty:
          content !== state.originalNote?.content ||
          state.title !== state.originalNote?.title,
      }));
    }
  },

  // ===== リセット =====
  reset: () => {
    const { originalNote } = get();

    if (originalNote) {
      set({
        content: originalNote.content,
        title: originalNote.title,
        isDirty: false,
        error: null,
      });
      get().history.reset(originalNote.content);
    }
  },

  // ===== ワードラップ切り替え =====
  toggleWordWrap: () => {
    set((state) => ({
      wordWrap: !state.wordWrap,
    }));
  },

  // ===== ビューモード設定 =====
  setViewMode: (mode: ViewMode) => {
    set({
      viewMode: mode,
    });
  },

  // ===== クリーンアップ =====
  cleanup: () => {
    get().history.clear();

    set({
      note: null,
      content: '',
      title: '',
      isDirty: false,
      isLoading: false,
      isSaving: false,
      error: null,
      noteId: null,
      originalNote: null,
    });
  },

  // ===== 計算プロパティ =====
  canUndo: () => get().history.canUndo(),
  canRedo: () => get().history.canRedo(),
}));
