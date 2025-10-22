/**
 * @file useNoteListChatContext.ts
 * @summary NoteListScreen用のチャットコンテキストプロバイダーフック
 * @responsibility ノート一覧画面のコンテキストをChatServiceに提供し、
 *                 コンテキスト依存のコマンドハンドラを登録する
 */

import { useEffect, useRef } from 'react';
import { ActiveScreenContextProvider, ActiveScreenContext } from '../types';
import ChatService from '../index';
import { logger } from '../../../utils/logger';
import { FileSystemItem } from '@shared/types/file';
import { NoteListStorage } from '../../../screen/note-list/noteStorage';
import { PathService } from '../../../services/PathService';
import { createDirectoryHandler } from '../handlers/createDirectoryHandler';
import { deleteItemHandler } from '../handlers/deleteItemHandler';
import { moveItemHandler } from '../handlers/moveItemHandler';
import { CommandHandlerContext } from '../handlers/types';

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

        const visibleFileList = itemsRef.current
          .filter(item => item.type === 'note') // ファイルのみに限定
          .map(item => {
            const path = item.item.path;
            const name = item.item.title;
            const type = 'file';
            const filePath = PathService.getFullPath(path, name, item.type);
            return {
              filePath,
              name, // Include name
              type, // Include type
              tags: item.item.tags,
            };
          });

        return {
          name: 'notelist',
          currentPath: currentPathRef.current,
          visibleFileList,
        };
      },
    };

    // ハンドラのコンテキストを作成
    const handlerContext: CommandHandlerContext = {
      noteListStorage: NoteListStorage,
    };

    // コマンドハンドラの定義（新しいハンドラ構造を使用）
    const commandHandlers = {
      create_directory: (command: any) => createDirectoryHandler(command, handlerContext),
      move_item: (command: any) => moveItemHandler(command, handlerContext),
      delete_item: (command: any) => deleteItemHandler(command, handlerContext),
    };

    // ChatServiceにプロバイダーとハンドラを登録
    logger.debug('chatService', '[useNoteListChatContext] Registering context provider and handlers');
    ChatService.registerActiveContextProvider(contextProvider);
    ChatService.registerCommandHandlers(commandHandlers);

    // クリーンアップ: アンマウント時にプロバイダーを解除
    return () => {
      logger.debug('chatService', '[useNoteListChatContext] Unregistering context provider');
      ChatService.unregisterActiveContextProvider();
    };
  }, [items, currentPath]);
};
