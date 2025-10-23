/**
 * @file createDirectoryHandler.ts
 * @summary create_directoryコマンドのハンドラ
 * @responsibility LLMからのディレクトリ作成コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler, CommandHandlerContext } from './types';
import { logger } from '../../../utils/logger';
import { FolderRepository } from '@data/folderRepository';

/**
 * create_directoryコマンドのハンドラ
 *
 * LLMから受け取ったディレクトリ作成リクエストを処理します。
 * FolderRepositoryを使用してフォルダを作成します。
 *
 * @param command create_directoryコマンド
 * @param context コマンドハンドラのコンテキスト
 */
export const createDirectoryHandler: CommandHandler = async (
  command: LLMCommand,
  context?: CommandHandlerContext
) => {
  logger.debug('toolService', 'Handling create_directory command', {
    path: command.path,
    name: command.content,
  });

  try {
    await FolderRepository.create({
      name: command.content || '',
      path: command.path || '/',
    });

    logger.debug('toolService', `Folder created: ${command.content}`);

    // FileListScreenの画面更新をトリガー
    if (context?.refreshData) {
      logger.debug('toolService', 'Refreshing FileList data after directory creation');
      await context.refreshData();
    }
  } catch (error) {
    logger.error('toolService', 'Error creating folder', error);
    throw error;
  }
};
