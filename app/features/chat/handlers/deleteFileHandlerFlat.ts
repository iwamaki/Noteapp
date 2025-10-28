/**
 * @file deleteFileHandlerFlat.ts
 * @summary delete_fileコマンドのハンドラ（フラット構造版）
 * @responsibility LLMからのファイル削除コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';
import { FileRepositoryFlat } from '@data/repositories/fileRepositoryFlat';

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
    const allFiles = await FileRepositoryFlat.getAll();
    const fileToDelete = allFiles.find(f => f.title === command.title);

    if (!fileToDelete) {
      logger.warn('chatService', `File not found for deletion: ${command.title}`);
      throw new Error(`ファイルが見つかりません: ${command.title}`);
    }

    // ファイルを削除
    await FileRepositoryFlat.delete(fileToDelete.id);

    logger.info('chatService', `File deleted successfully: ${fileToDelete.title} (ID: ${fileToDelete.id})`);

    // UIを更新
    if (context?.refreshData) {
      await context.refreshData();
      logger.debug('chatService', 'UI refreshed after file deletion');
    }
  } catch (error) {
    logger.error('chatService', 'Failed to delete file:', error);
    throw new Error(`ファイルの削除に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
};
