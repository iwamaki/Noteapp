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
import { NoteListStorage } from '../../../screen/note-list/noteStorage';
import { PathUtils } from '../../../screen/note-list/utils/pathUtils';

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

        // 全ノートとフォルダを取得して、LLMに提供
        let allFiles: Array<{ path: string; title: string; type: 'file' | 'directory' }> = [];
        try {
          const [allNotes, allFolders] = await Promise.all([
            NoteListStorage.getAllNotes(),
            NoteListStorage.getAllFolders(),
          ]);

          // フォルダをallFilesに追加
          allFiles = allFolders.map(folder => ({
            path: PathUtils.getFullPath(folder.path, folder.name),
            title: folder.name,
            type: 'directory' as const,
          }));

          // ノートをallFilesに追加
          allFiles.push(
            ...allNotes.map(note => ({
              path: PathUtils.getFullPath(note.path, note.title),
              title: note.title,
              type: 'file' as const,
            }))
          );

          logger.debug('chatService', '[useNoteListChatContext] All files collected', {
            totalFiles: allFiles.length,
          });
        } catch (error) {
          logger.error('chatService', '[useNoteListChatContext] Error collecting all files', error);
        }

        return {
          currentPath: currentPathRef.current,
          fileList: itemsRef.current.map(item => ({
            name: item.type === 'folder' ? item.item.name : item.item.title,
            type: item.type === 'folder' ? 'directory' : 'file',
          })),
          allFiles,
        };
      },
    };

    // コマンドハンドラの定義
    const commandHandlers = {
      create_directory: async (command: any) => {
        logger.debug('chatService', '[useNoteListChatContext] Handling create_directory command', {
          path: command.path,
          name: command.content,
        });

        try {
          await NoteListStorage.createFolder({
            name: command.content,
            path: command.path || '/',
          });
          logger.info('chatService', `[useNoteListChatContext] Folder created: ${command.content}`);
        } catch (error) {
          logger.error('chatService', '[useNoteListChatContext] Error creating folder', error);
        }
      },

      move_item: async (command: any) => {
        logger.debug('chatService', '[useNoteListChatContext] Handling move_item command', {
          source: command.source,
          destination: command.destination,
        });

        try {
          // パスから対象を特定して移動
          // ここでは簡易実装（実際のUIでの移動ロジックと統合が必要）
          logger.info('chatService', `[useNoteListChatContext] Move not fully implemented: ${command.source} -> ${command.destination}`);
        } catch (error) {
          logger.error('chatService', '[useNoteListChatContext] Error moving item', error);
        }
      },

      delete_item: async (command: any) => {
        logger.debug('chatService', '[useNoteListChatContext] Handling delete_item command', {
          path: command.path,
        });

        try {
          // パスから対象を特定して削除
          // ここでは簡易実装（実際のUIでの削除ロジックと統合が必要）
          logger.info('chatService', `[useNoteListChatContext] Delete not fully implemented: ${command.path}`);
        } catch (error) {
          logger.error('chatService', '[useNoteListChatContext] Error deleting item', error);
        }
      },
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
  }, []); // 空の依存配列で、マウント/アンマウント時のみ実行
};
