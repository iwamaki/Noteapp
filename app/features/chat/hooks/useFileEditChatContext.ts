/**
 * @file useFileEditChatContext.ts
 * @summary FileEditScreen用のチャットコンテキストプロバイダーフック
 * @responsibility ファイル編集画面のコンテキストをChatServiceに提供し、
 *                 コンテキスト依存のコマンドハンドラを登録する
 */
import { useEffect, useRef } from 'react';
import { ActiveScreenContextProvider, ActiveScreenContext } from '../types';
import ChatService from '../index';
import { logger } from '../../../utils/logger';
import { useSettingsStore } from '../../../settings/settingsStore';
import { editFileHandler } from '../handlers/editFileHandler';
import { CommandHandlerContext } from '../handlers/types';

interface UseFileEditChatContextParams {
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
 * ファイル編集画面用のチャットコンテキストプロバイダーフック
 *
 * このフックは、ファイル編集画面のコンテキストをChatServiceに登録し、
 * LLMからのコマンドを処理するハンドラを提供します。
 */
export const useFileEditChatContext = ({
  title,
  content,
  path,
  setContent,
}: UseFileEditChatContextParams): void => {
  const { settings } = useSettingsStore();

  // contentをuseRefで管理（依存配列から除外するため）
  const contentRef = useRef(content);

  // contentが変わったときにRefを同期
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // ChatServiceへの登録（contentの変更では再登録されない）
  useEffect(() => {
    const fullPath = buildFullPath(path, title);

    // ActiveScreenContextProviderの実装
    const contextProvider: ActiveScreenContextProvider = {
      getScreenContext: async (): Promise<ActiveScreenContext> => {
        logger.debug('chatService', '[useFileEditChatContext] Getting screen context', {
          fullPath,
          contentLength: contentRef.current.length,
          sendFileContextToLLM: settings.sendFileContextToLLM,
        });

        return {
          name: 'edit',
          filePath: fullPath,
          fileContent: settings.sendFileContextToLLM ? contentRef.current : '',
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
    logger.debug('chatService', '[useFileEditChatContext] Registering context provider and handlers');
    ChatService.registerActiveContextProvider(contextProvider);
    ChatService.registerCommandHandlers(commandHandlers);

    // クリーンアップ: アンマウント時にプロバイダーを解除
    return () => {
      logger.debug('chatService', '[useFileEditChatContext] Unregistering context provider');
      ChatService.unregisterActiveContextProvider();
    };
  }, [title, path, setContent, settings.sendFileContextToLLM]);
  // contentを依存配列から削除！
};
