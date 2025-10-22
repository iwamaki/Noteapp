/**
 * @file useNoteListContext.ts
 * @summary NoteListContextを使用するためのカスタムフック
 */

import { useContext } from 'react';
import { FileListContext, FileListContextValue } from './FileListContext';

/**
 * NoteListContextを使用するカスタムフック
 * @returns Contextの値
 * @throws Context外で使用された場合にエラー
 */
export function useFileListContext(): FileListContextValue {
  const context = useContext(FileListContext);

  if (context === undefined) {
    throw new Error(
      'useFileListContext must be used within a FileListProvider'
    );
  }

  return context;
}
