/**
 * @file stores/FileEditorStore.ts
 * @summary ファイル編集の状態管理（Zustand Store）
 * @description エディタの状態とアクションを一元管理
 */

import { create } from 'zustand';
import { EditorState, EditorActions, ViewMode, EditorError, FileFlat } from '../types';
import { fileService } from '../services/FileService';
import { HistoryManager } from './HistoryManager';

/**
 * ノートエディタストアの型定義
 */
interface FileEditorStore extends EditorState, EditorActions {
  // 追加の状態
  fileId: string | null;
  originalFile: FileFlat | null;
  history: HistoryManager;

  // 追加のアクション
  initialize: (fileId?: string, initialViewMode?: 'edit' | 'preview') => Promise<void>;
  cleanup: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

/**
 * Zustandストア
 * エディタの状態とアクションを統一管理
 */
export const useFileEditorStore = create<FileEditorStore>((set, get) => ({
  // ===== 初期状態 =====
  file: null,
  content: '',
  title: '',
  summary: '',
  isDirty: false,
  isLoading: false,
  isSaving: false,
  error: null,
  viewMode: 'edit' as ViewMode,
  fileId: null,
  originalFile: null,
  history: new HistoryManager(),

  // ===== 初期化 =====
  initialize: async (fileId?: string, initialViewMode?: 'edit' | 'preview') => {
    set({
      isLoading: true,
      error: null,
      fileId: fileId || null,
      viewMode: initialViewMode || 'edit',
    });

    try {
      if (fileId) {
        // 既存ファイルを読み込む
        const file = await fileService.loadFile(fileId);
        set({
          file: file,
          originalFile: file,
          content: file.content,
          title: file.title,
          summary: file.summary || '',
          isDirty: false,
          isLoading: false,
        });
        get().history.reset(file.content);
      } else {
        // 新規ファイルの作成
        set({
          file: null,
          originalFile: null,
	  content: '',
          title: '',
          summary: '',
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
    const { originalFile } = get();

    set((state) => ({
      content,
      isDirty:
        content !== originalFile?.content ||
        state.title !== originalFile?.title ||
        state.summary !== (originalFile?.summary || ''),
    }));

    get().history.push(content);
  },

  // ===== タイトル設定 =====
  setTitle: (title: string) => {
    const { originalFile, content, summary } = get();

    set({
      title,
      isDirty:
        content !== originalFile?.content ||
        title !== originalFile?.title ||
        summary !== (originalFile?.summary || ''),
    });
  },

  // ===== 要約設定 =====
  setSummary: (summary: string) => {
    const { originalFile, content, title } = get();

    set({
      summary,
      isDirty:
        content !== originalFile?.content ||
        title !== originalFile?.title ||
        summary !== (originalFile?.summary || ''),
    });
  },

  // ===== 保存 =====
  save: async () => {
    const { fileId, title, content, summary, isDirty } = get();

    if (!isDirty) {
      return;
    }

    set({
      isSaving: true,
      error: null,
    });

    try {
      const savedFile = await fileService.save({
        id: fileId || undefined,
        title,
        content,
        summary,
      });

      set({
        isSaving: false,
        isDirty: false,
        file: savedFile,
        originalFile: savedFile,
        fileId: savedFile.id,
        summary: savedFile.summary || '',
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
          content !== state.originalFile?.content ||
          state.title !== state.originalFile?.title,
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
          content !== state.originalFile?.content ||
          state.title !== state.originalFile?.title,
      }));
    }
  },

  // ===== リセット =====
  reset: () => {
    const { originalFile } = get();

    if (originalFile) {
      set({
        content: originalFile.content,
        title: originalFile.title,
        summary: originalFile.summary || '',
        isDirty: false,
        error: null,
      });
      get().history.reset(originalFile.content);
    }
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
      file: null,
      content: '',
      title: '',
      summary: '',
      isDirty: false,
      isLoading: false,
      isSaving: false,
      error: null,
      fileId: null,
      originalFile: null,
    });
  },

  // ===== 計算プロパティ =====
  canUndo: () => get().history.canUndo(),
  canRedo: () => get().history.canRedo(),
}));
