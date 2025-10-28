/**
 * @file useFileListChatContext.ts
 * @summary FileListScreenFlat用のチャットコンテキストプロバイダーフック
 * @responsibility ファイル一覧画面のコンテキストをChatServiceに提供し、
 *                 コンテキスト依存のコマンドハンドラを登録する（フラット構造版）
 */

import { useEffect, useRef } from 'react';
import { ActiveScreenContextProvider, ActiveScreenContext, FileListItem } from '../types';
import ChatService from '../index';
import { logger } from '../../../utils/logger';
import { CommandHandlerContext } from '../handlers/types';
import { createFileHandlerFlat } from '../handlers/createFileHandlerFlat';
import { deleteFileHandlerFlat } from '../handlers/deleteFileHandlerFlat';
import { renameFileHandlerFlat } from '../handlers/renameFileHandlerFlat';
import type { FileFlat } from '@data/core/typesFlat';

interface UseFileListChatContextParams {
  files: FileFlat[];
  refreshData: () => Promise<void>;
}

/**
 * ファイル一覧画面用のチャットコンテキストプロバイダーフック（フラット構造版）
 *
 * このフックは、ファイル一覧画面のコンテキストをChatServiceに登録します。
 * LLMには、現在表示されているファイルのリストを提供します。
 * フラット構造では、パスやフォルダの概念がなく、titleのみでファイルを識別します。
 */
export const useFileListChatContext = ({
  files,
  refreshData,
}: UseFileListChatContextParams): void => {
  const filesRef = useRef(files);

  // filesが更新されたらrefを更新
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    const contextProvider: ActiveScreenContextProvider = {
      getScreenContext: async (): Promise<ActiveScreenContext> => {
        logger.debug('chatService', '[useFileListChatContext] Getting screen context', {
          filesCount: filesRef.current.length,
        });

        // FileFlatをFileListItemに変換
        const visibleFileList: FileListItem[] = filesRef.current.map(file => ({
          title: file.title,
          type: 'file' as const,
          categories: file.categories,
          tags: file.tags,
        }));

        return {
          name: 'filelist',
          visibleFileList,
        };
      },
    };

    const handlerContext: CommandHandlerContext = {
      refreshData,
    };

    // フラット構造用のコマンドハンドラを登録
    const commandHandlers = {
      create_file: (command: any) => createFileHandlerFlat(command, handlerContext),
      delete_file: (command: any) => deleteFileHandlerFlat(command, handlerContext),
      rename_file: (command: any) => renameFileHandlerFlat(command, handlerContext),
    };

    logger.debug('chatService', '[useFileListChatContext] Registering context provider and handlers');
    ChatService.registerActiveContextProvider(contextProvider);
    ChatService.registerCommandHandlers(commandHandlers);

    return () => {
      logger.debug('chatService', '[useFileListChatContext] Unregistering context provider');
      ChatService.unregisterActiveContextProvider();
    };
  }, [refreshData]);
};
