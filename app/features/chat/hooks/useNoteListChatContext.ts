/**
 * @file useNoteListChatContext.ts
 * @summary NoteListScreen用のチャットコンテキストプロバイダーフック
 * @responsibility ノート一覧画面のコンテキストをChatServiceに提供する
 */

import { useEffect, useRef } from 'react';
import { ActiveScreenContextProvider, ActiveScreenContext } from '../types';
import ChatService from '../index';
import { logger } from '../../../utils/logger';
import { FileSystemItem } from '@shared/types/note';

interface UseNoteListChatContextParams {
  items: FileSystemItem[];
  currentPath: string;
}

/**
 * ノート一覧画面用のチャットコンテキストプロバイダーフック
 *
 * このフックは、ノート一覧画面のコンテキストをChatServiceに登録します。
 * LLMには、現在表示されているノートとフォルダのリストを提供します。
 */
export const useNoteListChatContext = ({
  items,
  currentPath,
}: UseNoteListChatContextParams): void => {
  // 最新のitemsとcurrentPathを参照するためのref
  const itemsRef = useRef(items);
  const currentPathRef = useRef(currentPath);

  // refを更新
  useEffect(() => {
    itemsRef.current = items;
    currentPathRef.current = currentPath;
  }, [items, currentPath]);

  useEffect(() => {
    // ActiveScreenContextProviderの実装
    const contextProvider: ActiveScreenContextProvider = {
      getScreenContext: async (): Promise<ActiveScreenContext> => {
        logger.debug('chatService', '[useNoteListChatContext] Getting screen context', {
          itemsCount: itemsRef.current.length,
          currentPath: currentPathRef.current,
        });

        return {
          currentPath: currentPathRef.current,
          fileList: itemsRef.current.map(item => ({
            name: item.type === 'folder' ? item.item.name : item.item.title,
            type: item.type === 'folder' ? 'directory' : 'file',
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
