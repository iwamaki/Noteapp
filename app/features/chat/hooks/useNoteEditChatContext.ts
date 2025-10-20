/**
 * @file useNoteEditChatContext.ts
 * @summary NoteEditScreen用のチャットコンテキストプロバイダーフック
 * @responsibility ノート編集画面のコンテキストをChatServiceに提供し、
 *                 コンテキスト依存のコマンドハンドラを登録する
 */
import { useEffect } from 'react';
import { ActiveScreenContextProvider, ActiveScreenContext } from '../types';
import ChatService from '../index';
import { logger } from '../../../utils/logger';
import { useSettingsStore } from '../../../settings/settingsStore';
import { editFileHandler } from '../handlers/editFileHandler';
import { CommandHandlerContext } from '../handlers/types';

interface UseNoteEditChatContextParams {
  title: string;
  content: string;
  path: string;
  setContent: (content: string) => void;
}

// パスとタイトルを結合してフルパスを作成するヘルパー関数
const buildFullPath = (path: string, title: string): string => {
  if (!path || path === '/') {
    return `/${title}`;
  }
  // パスの末尾にスラッシュがあるか確認
  if (path.endsWith('/')) {
    return `${path}${title}`;
  }
  return `${path}/${title}`;
};

/**
 * ノート編集画面用のチャットコンテキストプロバイダーフック
 *
 * このフックは、ノート編集画面のコンテキストをChatServiceに登録し、
 * LLMからのコマンドを処理するハンドラを提供します。
 */
export const useNoteEditChatContext = ({
  title,
  content,
  path,
  setContent,
}: UseNoteEditChatContextParams): void => {
  const { settings } = useSettingsStore();

  useEffect(() => {
    const fullPath = buildFullPath(path, title);

    // ActiveScreenContextProviderの実装
    const contextProvider: ActiveScreenContextProvider = {
      getScreenContext: async (): Promise<ActiveScreenContext> => {
        logger.debug('chatService', '[useNoteEditChatContext] Getting screen context', {
          fullPath,
          contentLength: content.length,
          sendNoteContextToLLM: settings.sendNoteContextToLLM,
        });

        return {
          name: 'edit',
          filePath: fullPath,
          fileContent: settings.sendNoteContextToLLM ? content : '',
        };
      },
    };

    // ハンドラのコンテキストを作成
    const handlerContext: CommandHandlerContext = {
      setContent,
    };

    // コマンドハンドラの定義（新しいハンドラ構造を使用）
    const commandHandlers = {
      edit_file: (command: any) => editFileHandler(command, handlerContext),
      // read_fileはサーバーサイドで処理されるため、フロントエンドハンドラは不要
    };

    // ChatServiceにプロバイダーとハンドラを登録
    logger.debug('chatService', '[useNoteEditChatContext] Registering context provider and handlers');
    ChatService.registerActiveContextProvider(contextProvider);
    ChatService.registerCommandHandlers(commandHandlers);

    // クリーンアップ: アンマウント時にプロバイダーを解除
    return () => {
      logger.debug('chatService', '[useNoteEditChatContext] Unregistering context provider');
      ChatService.unregisterActiveContextProvider();
    };
  }, [title, content, path, setContent, settings.sendNoteContextToLLM]);
};
