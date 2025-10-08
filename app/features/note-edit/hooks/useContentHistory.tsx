/**
 * @file useContentHistory.tsx
 * @summary コンテンツの履歴管理（undo/redo）を担当するフック
 * @responsibility 履歴の追加、undo、redo操作のみを管理。React Stateとは独立。
 */

import { useRef, useCallback } from 'react';

interface UseContentHistoryReturn {
  pushHistory: (content: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  reset: (initialContent: string) => void;
  getCurrentContent: () => string | null;
}

export const useContentHistory = (): UseContentHistoryReturn => {
  const history = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);

  // 履歴をリセット（ノート読み込み時）
  const reset = useCallback((initialContent: string) => {
    history.current = [initialContent];
    historyIndex.current = 0;
  }, []);

  // 履歴に追加
  const pushHistory = useCallback((content: string) => {
    // 履歴が空の場合は初期化
    if (history.current.length === 0) {
      history.current = [content];
      historyIndex.current = 0;
      return;
    }

    // 最後の履歴と同じ内容の場合は追加しない
    const lastContent = history.current[historyIndex.current];
    if (lastContent === content) {
      return;
    }

    // 現在の履歴位置以降を削除（redoの履歴を破棄）
    history.current = history.current.slice(0, historyIndex.current + 1);

    // 新しい状態を履歴に追加
    history.current.push(content);
    historyIndex.current = history.current.length - 1;
  }, []);

  // Undo（前の状態を返す）
  const undo = useCallback((): string | null => {
    if (historyIndex.current > 0) {
      historyIndex.current -= 1;
      return history.current[historyIndex.current];
    }
    return null;
  }, []);

  // Redo（次の状態を返す）
  const redo = useCallback((): string | null => {
    if (historyIndex.current < history.current.length - 1) {
      historyIndex.current += 1;
      return history.current[historyIndex.current];
    }
    return null;
  }, []);

  // Undo可能かチェック
  const canUndo = useCallback((): boolean => {
    return historyIndex.current > 0;
  }, []);

  // Redo可能かチェック
  const canRedo = useCallback((): boolean => {
    return historyIndex.current < history.current.length - 1;
  }, []);

  // 現在のコンテンツを取得
  const getCurrentContent = useCallback((): string | null => {
    if (historyIndex.current >= 0 && historyIndex.current < history.current.length) {
      return history.current[historyIndex.current];
    }
    return null;
  }, []);

  return {
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    getCurrentContent,
  };
};
