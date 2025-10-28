/**
 * @file useFileListChatContext.ts
 * @summary FileListScreen用のチャットコンテキストプロバイダーフック
 * @responsibility ファイル一覧画面のコンテキストをChatServiceに提供し、
 *                 コンテキスト依存のコマンドハンドラを登録する
 */

// TODO: Update for flat structure migration
// This hook is disabled as it depends on deleted V2 handlers and old file-list context
// import { useEffect, useRef } from 'react';
// import { ActiveScreenContextProvider, ActiveScreenContext } from '../types';
// import ChatService from '../index';
import { logger } from '../../../utils/logger';
// import type { FileSystemItem } from '@data/core/types';
// import { createDirectoryHandlerV2 } from '../handlers/createDirectoryHandlerV2';
// import { deleteItemHandlerV2 } from '../handlers/deleteItemHandlerV2';
// import { moveItemHandlerV2 } from '../handlers/moveItemHandlerV2';
// import { CommandHandlerContext } from '../handlers/types';
// import { useFileListContext } from '../../../screen/file-list/context/useFileListContext';

interface UseFileListChatContextParams {
  items: any[]; // TODO: Update to use flat structure types
  currentPath: string;
}

/**
 * ファイル一覧画面用のチャットコンテキストプロバイダーフック
 *
 * このフックは、ファイル一覧画面のコンテキストをChatServiceに登録します。
 * LLMには、現在表示されているファイルとフォルダのリストを提供します。
 */
export const useFileListChatContext = ({
  items,
  currentPath,
}: UseFileListChatContextParams): void => {
  // TODO: Re-implement for flat structure
  // This hook is disabled as it depends on deleted V2 handlers and old file-list context
  logger.warn('chatService', 'useFileListChatContext is disabled for flat structure migration');

  /* Old implementation - disabled
  const { actions } = useFileListContext();
  const itemsRef = useRef(items);
  const currentPathRef = useRef(currentPath);

  useEffect(() => {
    itemsRef.current = items;
    currentPathRef.current = currentPath;
  }, [items, currentPath]);

  useEffect(() => {
    const contextProvider: ActiveScreenContextProvider = {
      getScreenContext: async (): Promise<ActiveScreenContext> => {
        logger.debug('chatService', '[useFileListChatContext] Getting screen context', {
          itemsCount: itemsRef.current.length,
          currentPath: currentPathRef.current,
        });

        const visibleFileList = itemsRef.current
          .map(item => {
            const name = item.type === 'file' ? item.item.title : (item.item as any).name;
            const type = item.type === 'file' ? 'file' : 'directory';
            const filePath = `/${name}`;
            return {
              filePath,
              name,
              type,
              tags: item.type === 'file' ? item.item.tags : undefined,
            };
          });

        return {
          name: 'filelist',
          currentPath: currentPathRef.current,
          visibleFileList,
        };
      },
    };

    const handlerContext: CommandHandlerContext = {
      refreshData: actions.refreshData,
    };

    const commandHandlers = {
      create_directory: (command: any) => createDirectoryHandlerV2(command, handlerContext),
      move_item: (command: any) => moveItemHandlerV2(command, handlerContext),
      delete_item: (command: any) => deleteItemHandlerV2(command, handlerContext),
    };

    logger.debug('chatService', '[useFileListChatContext] Registering context provider and handlers');
    ChatService.registerActiveContextProvider(contextProvider);
    ChatService.registerCommandHandlers(commandHandlers);

    return () => {
      logger.debug('chatService', '[useFileListChatContext] Unregistering context provider');
      ChatService.unregisterActiveContextProvider();
    };
  }, [actions.refreshData]);
  */
};
