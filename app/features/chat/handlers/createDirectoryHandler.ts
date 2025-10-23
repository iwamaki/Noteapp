/**
 * @file createDirectoryHandler.ts
 * @summary create_directoryコマンドのハンドラ
 * @responsibility LLMからのディレクトリ作成コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';
import { FolderRepository } from '@data/folderRepository';

/**
 * create_directoryコマンドのハンドラ
 *
 * LLMから受け取ったディレクトリ作成リクエストを処理します。
 * FolderRepositoryを使用してフォルダを作成します。
 *
 * @param command create_directoryコマンド
 */
export const createDirectoryHandler: CommandHandler = async (command: LLMCommand) => {
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
  } catch (error) {
    logger.error('toolService', 'Error creating folder', error);
    throw error;
  }
};
