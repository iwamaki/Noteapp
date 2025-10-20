/**
 * @file useNoteEditChatContext.ts
 * @summary NoteEditScreen用のチャットコンテキストプロバイダーフック
 * @responsibility ノート編集画面のコンテキストをChatServiceに提供し、
 *                 edit_file、read_fileなどのコマンドハンドラを登録する
 */
import { useEffect } from 'react';
import { ActiveScreenContextProvider, ActiveScreenContext } from '../types';
import { LLMCommand } from '../llmService/types/types';
import ChatService from '../index';
import { logger } from '../../../utils/logger';
import { useSettingsStore } from '../../../settings/settingsStore';

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

    // コマンドハンドラの定義
    const commandHandlers: Record<string, (command: LLMCommand) => void | Promise<void>> = {
      edit_file: (command: LLMCommand) => {
        logger.debug('chatService', '[useNoteEditChatContext] Handling edit_file command');
        if (typeof command.content === 'string') {
          // LLMからのコンテキストには時々コードブロックのマークダウンが含まれるため、削除する
          const newContent = command.content.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
          setContent(newContent);
        }
      },
      read_file: (command: LLMCommand) => {
        logger.debug('chatService', '[useNoteEditChatContext] Handling read_file command', {
          path: command.path,
        });
        // read_fileはバックエンドで処理されるため、フロントエンドでは何もしない
        console.log(`[read_file] Received command to read file: ${command.path}. This is handled by the backend agent.`);
      },
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
