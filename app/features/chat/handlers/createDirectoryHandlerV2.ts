/**
 * @file createDirectoryHandlerV2.ts
 * @summary create_directoryコマンドのハンドラ（V2構造対応）
 * @responsibility LLMからのディレクトリ作成コマンドを処理します
 *
 * V1との主な違い:
 * - ✅ FolderRepositoryV2を使用
 * - ✅ パスベースの効率的な作成
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler, CommandHandlerContext } from './types';
import { logger } from '../../../utils/logger';
import { FolderRepositoryV2 } from '@data/repositories/folderRepositoryV2';

/**
 * create_directoryコマンドのハンドラ（V2）
 *
 * LLMから受け取ったディレクトリ作成リクエストを処理します。
 * FolderRepositoryV2を使用してフォルダを作成します。
 *
 * V1との違い:
 * - FolderRepositoryV2.create()を使用（パスベース）
 * - より効率的な実装
 *
 * @param command create_directoryコマンド
 * @param context コマンドハンドラのコンテキスト
 */
export const createDirectoryHandlerV2: CommandHandler = async (
  command: LLMCommand,
  context?: CommandHandlerContext
) => {
  logger.debug('toolService', 'Handling create_directory command (V2)', {
    path: command.path,
    name: command.content,
  });

  try {
    await FolderRepositoryV2.create(
      {
        name: command.content || '',
      },
      command.path || '/'
    );

    logger.debug('toolService', `Folder created (V2): ${command.content}`);

    // FileListScreenの画面更新をトリガー
    if (context?.refreshData) {
      logger.debug('toolService', 'Refreshing FileList data after directory creation');
      await context.refreshData();
    }
  } catch (error) {
    logger.error('toolService', 'Error creating folder (V2)', error);
    throw error;
  }
};
