/**
 * @file createDirectoryHandler.ts
 * @summary create_directoryコマンドのハンドラ
 * @responsibility LLMからのディレクトリ作成コマンドを処理します
 */

import { LLMCommand } from '../llmService/types/types';
import { CommandHandler } from './types';
import { logger } from '../../../utils/logger';
import { NoteListStorage } from '../../../screen/note-list/noteStorage';

/**
 * create_directoryコマンドのハンドラ
 *
 * LLMから受け取ったディレクトリ作成リクエストを処理します。
 * NoteListStorageを使用してフォルダを作成します。
 *
 * @param command create_directoryコマンド
 * @param context noteListStorageを含むコンテキスト（オプション）
 */
export const createDirectoryHandler: CommandHandler = async (command: LLMCommand, context?) => {
  logger.debug('createDirectoryHandler', 'Handling create_directory command', {
    path: command.path,
    name: command.content,
  });

  try {
    // コンテキストからNoteListStorageを取得、なければデフォルトを使用
    const storage = context?.noteListStorage || NoteListStorage;

    await storage.createFolder({
      name: command.content || '',
      path: command.path || '/',
    });

    logger.debug('createDirectoryHandler', `Folder created: ${command.content}`);
  } catch (error) {
    logger.error('createDirectoryHandler', 'Error creating folder', error);
    throw error;
  }
};
