/**
 * @file deleteFileHandlerFlat.ts
 * @summary delete_fileコマンドのハンドラ（フラット構造版）
 * @responsibility LLMからのファイル削除コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';
import { FileRepository } from '@data/repositories/fileRepository';
import { UnifiedErrorHandler } from '../utils/errorHandler';

/**
 * delete_fileコマンドのハンドラ（フラット構造版）
 *
 * LLMから受け取ったファイル削除コマンドを処理します。
 * フラット構造では、titleでファイルを検索してから削除します。
 *
 * @param command delete_fileコマンド
 *   - title: 削除するファイル名
 * @param context refreshData関数を含むコンテキスト
 */
export const deleteFileHandlerFlat: CommandHandler = async (command: LLMCommand, context?) => {
  logger.debug('chatService', 'Handling delete_file command (flat)', {
    title: command.title,
  });

  // titleの検証
  if (!command.title || typeof command.title !== 'string') {
    logger.error('chatService', 'Invalid title in delete_file command');
    throw new Error('ファイル名が指定されていません');
  }

  try {
    // 全ファイルを取得してtitleで検索
    const allFiles = await FileRepository.getAll();
    const fileToDelete = allFiles.find(f => f.title === command.title);

    if (!fileToDelete) {
      logger.warn('chatService', `File not found for deletion: ${command.title}`);
      throw new Error(`ファイルが見つかりません: ${command.title}`);
    }

    // ファイルを削除
    await FileRepository.delete(fileToDelete.id);

    logger.info('chatService', `File deleted successfully: ${fileToDelete.title} (ID: ${fileToDelete.id})`);

    // UIを更新
    if (context?.refreshData) {
      await context.refreshData();
      logger.debug('chatService', 'UI refreshed after file deletion');
    }
  } catch (error) {
    UnifiedErrorHandler.handleCommandError(
      {
        location: 'deleteFileHandler',
        operation: 'ファイルの削除',
        metadata: { title: command.title },
      },
      'ファイルの削除',
      error
    );
  }
};
