/**
 * @file hooks/useFileEditor.tsx
 * @summary リファクタリング後の統一されたファイルエディタフック
 * @description Zustandストアと各種フックを組み合わせたファサード
 */

import { useEffect } from 'react';
import { useFileEditorStore } from '../stores/FileEditorStore';
// import { useAutoSave } from './useAutoSave';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning';

/**
 * リファクタリング後のノートエディタフック
 * すべての機能を統合したシンプルなインターフェース
 */
export const useFileEditor = (fileId?: string, initialViewMode?: 'edit' | 'preview') => {
  // Zustandストアから状態とアクションを取得
  const store = useFileEditorStore();

  // 初期化
  useEffect(() => {
    store.initialize(fileId, initialViewMode);

    return () => {
      store.cleanup();
    };
  }, [fileId, initialViewMode]);

  // 自動保存機能（オプション - デフォルトでは無効）
  // useAutoSave({
  //   enabled: false, // 必要に応じてtrueに変更
  //   delay: 5000,
  //   onSave: store.save,
  //   isDirty: store.isDirty,
  // });

  // キーボードショートカット
  useKeyboardShortcuts({
    onSave: store.save,
    onUndo: store.undo,
    onRedo: store.redo,
  });

  // 未保存変更の警告
  useUnsavedChangesWarning(store.isDirty);

  // シンプルなインターフェースを返す
  return {
    // 状態
    file: store.file,
    content: store.content,
    title: store.title,
    summary: store.summary,
    category: store.file?.category || '',
    isDirty: store.isDirty,
    isLoading: store.isLoading,
    isSaving: store.isSaving,
    error: store.error,
    viewMode: store.viewMode,

    // アクション
    setContent: store.setContent,
    setTitle: store.setTitle,
    setSummary: store.setSummary,
    save: store.save,
    undo: store.undo,
    redo: store.redo,
    canUndo: store.canUndo(),
    canRedo: store.canRedo(),
    reset: store.reset,
    setViewMode: store.setViewMode,
  };
};
