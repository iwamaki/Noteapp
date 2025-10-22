/**
 * @file hooks/useAutoSave.ts
 * @summary 自動保存機能を提供するフック
 * @description 変更が検出されたら自動的に保存を実行
 */

import { useEffect, useRef } from 'react';

interface UseAutoSaveOptions {
  enabled?: boolean;
  delay?: number;
  onSave: () => Promise<void>;
  isDirty: boolean;
}

/**
 * 自動保存フック
 * isDirtyがtrueの場合、指定された遅延後に自動保存を実行
 */
export const useAutoSave = ({
  enabled = true,
  delay = 5000,
  onSave,
  isDirty,
}: UseAutoSaveOptions) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !isDirty) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // 既存のタイマーをクリア
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 新しいタイマーをセット
    timerRef.current = setTimeout(async () => {
      if (!isSavingRef.current) {
        isSavingRef.current = true;
        try {
          await onSave();
        } catch (error) {
          console.error('Auto-save failed:', error);
        } finally {
          isSavingRef.current = false;
        }
      }
    }, delay);

    // クリーンアップ
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [enabled, delay, onSave, isDirty]);

  // 手動での即座の保存
  const saveNow = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!isSavingRef.current && isDirty) {
      isSavingRef.current = true;
      try {
        await onSave();
      } catch (error) {
        console.error('Manual save failed:', error);
        throw error;
      } finally {
        isSavingRef.current = false;
      }
    }
  };

  return { saveNow };
};
