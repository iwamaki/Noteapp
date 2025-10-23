/**
 * @file useFileListChatContext.ts
 * @summary FileListScreen用のチャットコンテキストプロバイダーフック
 * @responsibility ファイル一覧画面のコンテキストをChatServiceに提供し、
 *                 コンテキスト依存のコマンドハンドラを登録する
 */

import { useEffect, useRef } from 'react';
import { ActiveScreenContextProvider, ActiveScreenContext } from '../types';
import ChatService from '../index';
import { logger } from '../../../utils/logger';
import { FileSystemItem } from '@data/type';
import { PathService } from '../../../services/PathService';
import { createDirectoryHandler } from '../handlers/createDirectoryHandler';
import { deleteItemHandler } from '../handlers/deleteItemHandler';
import { moveItemHandler } from '../handlers/moveItemHandler';
import { CommandHandlerContext } from '../handlers/types';
import { useFileListContext } from '../../../screen/file-list/context/useFileListContext';

interface UseFileListChatContextParams {
  items: FileSystemItem[];
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
  // FileListContextから actions を取得
  const { actions } = useFileListContext();

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
        logger.debug('chatService', '[useFileListChatContext] Getting screen context', {
          itemsCount: itemsRef.current.length,
          currentPath: currentPathRef.current,
        });

        const visibleFileList = itemsRef.current
          .map(item => {
            const path = item.item.path;
            const name = item.type === 'file' ? item.item.title : (item.item as any).name;
            const type = item.type === 'file' ? 'file' : 'directory';
            const filePath = PathService.getFullPath(path, name, item.type);
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

    // ハンドラのコンテキストを作成し、refreshData を含める
    const handlerContext: CommandHandlerContext = {
      refreshData: actions.refreshData,
    };

    // コマンドハンドラの定義（新しいハンドラ構造を使用）
    const commandHandlers = {
      create_directory: (command: any) => createDirectoryHandler(command, handlerContext),
      move_item: (command: any) => moveItemHandler(command, handlerContext),
      delete_item: (command: any) => deleteItemHandler(command, handlerContext),
    };

    // ChatServiceにプロバイダーとハンドラを登録
    logger.debug('chatService', '[useFileListChatContext] Registering context provider and handlers');
    ChatService.registerActiveContextProvider(contextProvider);
    ChatService.registerCommandHandlers(commandHandlers);

    // クリーンアップ: アンマウント時にプロバイダーを解除
    return () => {
      logger.debug('chatService', '[useFileListChatContext] Unregistering context provider');
      ChatService.unregisterActiveContextProvider();
    };
  }, [actions.refreshData]);
};
