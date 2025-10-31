/**
 * @file useFileListChatContext.ts
 * @summary FileListScreenFlat用のチャットコンテキストプロバイダーフック
 * @responsibility ファイル一覧画面のコンテキストをChatServiceに提供し、
 *                 コンテキスト依存のコマンドハンドラを登録する（フラット構造版）
 */

import { useEffect, useRef } from 'react';
import { ActiveScreenContextProvider, ActiveScreenContext } from '../types';
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
        logger.debug('chatService', '[useFileListChatContext] Getting screen context (no visibleFileList - using allFiles instead)');

        // Note: visibleFileList は冗長なため廃止
        // 全ファイル情報は allFiles として ChatService.buildChatContext() で送信される
        return {
          name: 'filelist',
        };
      },
    };

    const handlerContext: CommandHandlerContext = {
      refreshData,
    };

    // フラット構造用のコマンドハンドラを登録
    // Note: これらのハンドラは画面遷移後も保持されます（ChatServiceの仕様変更により）
    // 他の画面（例: FileEdit）が独自のハンドラを登録しても、これらは上書きされず共存します
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
