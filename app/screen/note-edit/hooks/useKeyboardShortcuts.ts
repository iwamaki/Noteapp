/**
 * @file hooks/useKeyboardShortcuts.ts
 * @summary キーボードショートカット機能を提供するフック
 * @description エディタ操作のキーボードショートカットを登録
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';

interface Shortcuts {
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
}

/**
 * キーボードショートカットフック
 * Webプラットフォームでのみ動作
 */
export const useKeyboardShortcuts = (shortcuts: Shortcuts) => {
  useEffect(() => {
    // Webプラットフォームのみ
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      if (isMeta) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            shortcuts.onSave?.();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              shortcuts.onRedo?.();
            } else {
              shortcuts.onUndo?.();
            }
            break;
          case 'y':
            e.preventDefault();
            shortcuts.onRedo?.();
            break;
          case 'f':
            e.preventDefault();
            shortcuts.onFind?.();
            break;
          case 'h':
            e.preventDefault();
            shortcuts.onReplace?.();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};
