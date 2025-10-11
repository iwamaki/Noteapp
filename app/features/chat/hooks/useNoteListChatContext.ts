/**
 * @file useNoteListChatContext.ts
 * @summary NoteListScreen用のチャットコンテキストプロバイダーフック
 * @responsibility ノート一覧画面のコンテキストをChatServiceに提供する
 */

import { useEffect, useRef } from 'react';
import { ActiveScreenContextProvider, ActiveScreenContext } from '../../../services/chatService/types';
import ChatService from '../../../services/chatService';
import { logger } from '../../../utils/logger';

interface Note {
  id: string;
  title: string;
  content: string;
}

interface UseNoteListChatContextParams {
  notes: Note[];
}

/**
 * ノート一覧画面用のチャットコンテキストプロバイダーフック
 *
 * このフックは、ノート一覧画面のコンテキストをChatServiceに登録します。
 * LLMには、現在表示されているノートのリストを提供します。
 */
export const useNoteListChatContext = ({
  notes,
}: UseNoteListChatContextParams): void => {
  // 最新のnotesを参照するためのref
  const notesRef = useRef(notes);

  // refを更新
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => {
    // ActiveScreenContextProviderの実装
    const contextProvider: ActiveScreenContextProvider = {
      getScreenContext: async (): Promise<ActiveScreenContext> => {
        logger.debug('chatService', '[useNoteListChatContext] Getting screen context', {
          notesCount: notesRef.current.length,
        });

        return {
          currentPath: '/',
          fileList: notesRef.current.map(note => ({
            name: note.title,
            type: 'file' as const,
          })),
        };
      },
    };

    // ChatServiceにプロバイダーを登録
    logger.debug('chatService', '[useNoteListChatContext] Registering context provider');
    ChatService.registerActiveContextProvider(contextProvider);

    // クリーンアップ: アンマウント時にプロバイダーを解除
    return () => {
      logger.debug('chatService', '[useNoteListChatContext] Unregistering context provider');
      ChatService.unregisterActiveContextProvider();
    };
  }, []); // 空の依存配列で、マウント/アンマウント時のみ実行
};
