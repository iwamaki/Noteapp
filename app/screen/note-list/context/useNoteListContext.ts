/**
 * @file useNoteListContext.ts
 * @summary NoteListContextを使用するためのカスタムフック
 */

import { useContext } from 'react';
import { NoteListContext, NoteListContextValue } from './NoteListContext';

/**
 * NoteListContextを使用するカスタムフック
 * @returns Contextの値
 * @throws Context外で使用された場合にエラー
 */
export function useNoteListContext(): NoteListContextValue {
  const context = useContext(NoteListContext);

  if (context === undefined) {
    throw new Error(
      'useNoteListContext must be used within a NoteListProvider'
    );
  }

  return context;
}
