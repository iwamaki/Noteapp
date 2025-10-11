/**
 * @file useNoteEditChatContext.ts
 * @summary NoteEditScreen用のチャットコンテキストプロバイダーフック
 * @responsibility ノート編集画面のコンテキストをChatServiceに提供し、
 *                 edit_file、read_fileなどのコマンドハンドラを登録する
 */

import { useEffect, useRef } from 'react';
import { ActiveScreenContextProvider, ActiveScreenContext } from '../../../services/chatService/types';
import { LLMCommand } from '../../../services/llmService/types/types';
import ChatService from '../../../services/chatService';
import { logger } from '../../../utils/logger';

interface UseNoteEditChatContextParams {
  title: string;
  content: string;
  setContent: (content: string) => void;
}

/**
 * ノート編集画面用のチャットコンテキストプロバイダーフック
 *
 * このフックは、ノート編集画面のコンテキストをChatServiceに登録し、
 * LLMからのコマンドを処理するハンドラを提供します。
 */
export const useNoteEditChatContext = ({
  title,
  content,
  setContent,
}: UseNoteEditChatContextParams): void => {
  // 最新のtitleとcontentを参照するためのref
  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const setContentRef = useRef(setContent);

  // refを更新
  useEffect(() => {
    titleRef.current = title;
    contentRef.current = content;
    setContentRef.current = setContent;
  }, [title, content, setContent]);

  useEffect(() => {
    // ActiveScreenContextProviderの実装
    const contextProvider: ActiveScreenContextProvider = {
      getScreenContext: async (): Promise<ActiveScreenContext> => {
        logger.debug('chatService', '[useNoteEditChatContext] Getting screen context', {
          title: titleRef.current,
          contentLength: contentRef.current.length,
        });

        return {
          currentNoteTitle: titleRef.current,
          currentNoteContent: contentRef.current,
        };
      },
    };

    // コマンドハンドラの定義
    const commandHandlers: Record<string, (command: LLMCommand) => void | Promise<void>> = {
      edit_file: (command: LLMCommand) => {
        logger.debug('chatService', '[useNoteEditChatContext] Handling edit_file command');
        if (typeof command.content === 'string') {
          const newContent = command.content.replace(/^---\s*/, '').replace(/\s*---$/, '');
          setContentRef.current(newContent);
        }
      },
      read_file: (command: LLMCommand) => {
        logger.debug('chatService', '[useNoteEditChatContext] Handling read_file command', {
          path: command.path,
        });
        // read_fileコマンドはバックエンドで自動的に処理されるため、
        // フロントエンドでは特に何もする必要はありません
        console.log(`[read_file] ファイル読み込みコマンドを受信: ${command.path}`);
        console.log(`[read_file] このコマンドはバックエンドのAgentで既に処理済みです`);
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
  }, []); // 空の依存配列で、マウント/アンマウント時のみ実行
};
