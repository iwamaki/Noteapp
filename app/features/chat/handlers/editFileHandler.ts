/**
 * @file editFileHandler.ts
 * @summary edit_fileコマンドのハンドラ
 * @responsibility LLMからのファイル編集コマンドを処理します
 */

import { LLMCommand } from '../../llmService/types/index';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';
import { UnifiedErrorHandler } from '../utils/errorHandler';

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

  try {
    if (!context?.setContent) {
      throw new Error('setContent関数がコンテキストに提供されていません');
    }

    if (typeof command.content !== 'string') {
      throw new Error(`無効なコンテンツタイプです: ${typeof command.content}`);
    }

    // LLMからのコンテキストには時々コードブロックのマークダウンが含まれるため、削除する
    const newContent = command.content
      .replace(/^```[a-zA-Z]*\n/, '')
      .replace(/\n```$/, '');

    context.setContent(newContent);
    logger.debug('toolService', 'File content updated successfully');
  } catch (error) {
    UnifiedErrorHandler.handleCommandError(
      {
        location: 'editFileHandler',
        operation: 'ファイルの編集',
      },
      'ファイルの編集',
      error
    );
  }
};
