/**
 * @file renameFileHandlerFlat.ts
 * @summary rename_fileコマンドのハンドラ（フラット構造版）
 * @responsibility LLMからのファイル名変更コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/index';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';
import { FileRepository } from '@data/repositories/fileRepository';
import { UnifiedErrorHandler } from '../utils/errorHandler';

/**
 * rename_fileコマンドのハンドラ（フラット構造版）
 *
 * LLMから受け取ったファイル名変更コマンドを処理します。
 * フラット構造では、titleでファイルを検索してから名前を変更します。
 *
 * @param command rename_fileコマンド
 *   - title: 現在のファイル名
 *   - new_title: 新しいファイル名
 * @param context refreshData関数を含むコンテキスト
 */
export const renameFileHandlerFlat: CommandHandler = async (command: LLMCommand, context?) => {
  logger.debug('chatService', 'Handling rename_file command (flat)', {
    title: command.title,
    newTitle: command.new_title,
  });

  // パラメータの検証
  if (!command.title || typeof command.title !== 'string') {
    logger.error('chatService', 'Invalid title in rename_file command');
    throw new Error('現在のファイル名が指定されていません');
  }

  if (!command.new_title || typeof command.new_title !== 'string') {
    logger.error('chatService', 'Invalid new_title in rename_file command');
    throw new Error('新しいファイル名が指定されていません');
  }

  try {
    // 全ファイルを取得してtitleで検索
    const allFiles = await FileRepository.getAll();
    const fileToRename = allFiles.find(f => f.title === command.title);

    if (!fileToRename) {
      logger.warn('chatService', `File not found for rename: ${command.title}`);
      throw new Error(`ファイルが見つかりません: ${command.title}`);
    }

    // ファイル名を変更
    await FileRepository.update(fileToRename.id, {
      title: command.new_title,
    });

    logger.info('chatService', `File renamed successfully: ${command.title} -> ${command.new_title} (ID: ${fileToRename.id})`);

    // UIを更新
    if (context?.refreshData) {
      await context.refreshData();
      logger.debug('chatService', 'UI refreshed after file rename');
    }
  } catch (error) {
    UnifiedErrorHandler.handleCommandError(
      {
        location: 'renameFileHandler',
        operation: 'ファイル名の変更',
        metadata: { title: command.title, newTitle: command.new_title },
      },
      'ファイル名の変更',
      error
    );
  }
};
