/**
 * @file editFileHandler.ts
 * @summary edit_fileコマンドのハンドラ
 * @responsibility LLMからのファイル編集コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';

/**
 * edit_fileコマンドのハンドラ
 *
 * LLMから受け取ったファイルの内容をUIに反映します。
 * コンテキストから setContent 関数を受け取り、新しい内容を設定します。
 *
 * @param command edit_fileコマンド
 * @param context setContent関数を含むコンテキスト
 */
export const editFileHandler: CommandHandler = (command: LLMCommand, context?) => {
  logger.debug('toolService', 'Handling edit_file command', {
    hasContent: !!command.content,
  });

  if (!context?.setContent) {
    logger.error('toolService', 'setContent function not provided in context');
    return;
  }

  if (typeof command.content === 'string') {
    // LLMからのコンテキストには時々コードブロックのマークダウンが含まれるため、削除する
    const newContent = command.content
      .replace(/^```[a-zA-Z]*\n/, '')
      .replace(/\n```$/, '');

    context.setContent(newContent);
    logger.debug('toolService', 'File content updated successfully');
  } else {
    logger.warn('toolService', 'Invalid content type', typeof command.content);
  }
};
