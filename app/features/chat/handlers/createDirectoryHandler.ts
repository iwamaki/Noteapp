/**
 * @file createDirectoryHandler.ts
 * @summary create_directoryコマンドのハンドラ
 * @responsibility LLMからのディレクトリ作成コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';
import { FileListStorage } from '../../../screen/file-list/fileStorage';

/**
 * create_directoryコマンドのハンドラ
 *
 * LLMから受け取ったディレクトリ作成リクエストを処理します。
 * FileListStorageを使用してフォルダを作成します。
 *
 * @param command create_directoryコマンド
 * @param context noteListStorageを含むコンテキスト（オプション）
 */
export const createDirectoryHandler: CommandHandler = async (command: LLMCommand, context?) => {
  logger.debug('toolService', 'Handling create_directory command', {
    path: command.path,
    name: command.content,
  });

  try {
    // コンテキストからFileListStorageを取得、なければデフォルトを使用
    const storage = context?.fileListStorage || FileListStorage;

    await storage.createFolder({
      name: command.content || '',
      path: command.path || '/',
    });

    logger.debug('toolService', `Folder created: ${command.content}`);
  } catch (error) {
    logger.error('toolService', 'Error creating folder', error);
    throw error;
  }
};
